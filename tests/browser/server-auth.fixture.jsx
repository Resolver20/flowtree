import React, { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { useGoogleDrivePlan } from '/src/hooks/useGoogleDrivePlan.js'
import { createBlankFlowData } from '/src/hooks/useFlowData.js'
import { serializeFlowData } from '/src/domain/flowDataTransfer.js'
import { serverAuthEnabled } from '/src/lib/serverAuth.js'

// Synthetic server responses, never contacts Google or writes a real plan.
const mode = new URLSearchParams(location.search).get('mode') || 'restore'
const requests = []
let fail = mode === 'retry'
let signedOut = mode === 'auth-error'
let generation = 0
const noop = () => {}
window.google = { accounts: { oauth2: { initTokenClient() { throw Error('Server mode must not use GIS') } } } }
window.fetch = async (url, options = {}) => {
  const headers = new Headers(options.headers)
  requests.push({ url, method: options.method || 'GET', authorization: headers.has('Authorization'), cookies: options.credentials })
  if (url === '/auth/logout') { signedOut = true; return Response.json({}) }
  if (url === '/auth/session') return Response.json({ configured: true, authenticated: !signedOut, user: { emailAddress: 'synthetic@example.invalid' } })
  if (url.startsWith('/api/drive/files?')) {
    if (decodeURIComponent(url).includes('application/vnd.google-apps.folder')) return Response.json({ files: [{ id: 'folder', name: 'gpt' }] })
    return Response.json({ files: mode === 'empty' ? [] : mode === 'duplicates' ? [{ id: 'one', name: 'flowtree-plan.json' }, { id: 'two', name: 'older.json' }] : [{ id: 'one', name: 'flowtree-plan.json' }] })
  }
  if (url.startsWith('/api/drive/files/')) {
    if (fail) { fail = false; return new Response('', { status: 503 }) }
    return new Response(serializeFlowData({ ...createBlankFlowData(), profile: { name: 'Synthetic restored plan', visible: true } }))
  }
  throw Error('Unexpected request')
}
export function Session() {
  const [plan, replaceData] = useState(createBlankFlowData)
  const [dialog, setDialog] = useState(null)
  const sync = useGoogleDrivePlan({ plan, replaceData, captureCurrentMonth: noop, dialog, setDialog, setPath: noop, notify: noop })
  const result = { mode, enabled: serverAuthEnabled, startup: sync.startupState, status: sync.drive.status, error: sync.drive.error, retry: !!sync.drive.retryRestore, profile: plan.profile.name, dialog: dialog?.type, requests: requests.length, writes: requests.filter(request => request.method !== 'GET' && request.url !== '/auth/logout').length, browserAuthorization: requests.some(request => request.authorization), allSameOrigin: requests.every(request => request.cookies === 'same-origin'), storedCredentials: sessionStorage.getItem('flowtree-drive-session-v1') }
  return <><pre id="result">{JSON.stringify(result, null, 2)}</pre><button onClick={() => sync.connectDrive()}>Retry</button><button onClick={() => sync.chooseDriveRestoreCandidate('two')}>Choose older plan</button><button onClick={() => sync.disconnectDrive()}>Sign out</button></>
}
export function Fixture() {
  const [key, setKey] = useState(0)
  return <><button onClick={() => { generation++; setKey(generation) }}>Reopen app</button><Session key={key} /></>
}
createRoot(document.getElementById('root')).render(<Fixture />)
