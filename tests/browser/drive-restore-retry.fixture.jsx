import React, { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { useGoogleDrivePlan } from '/src/hooks/useGoogleDrivePlan.js'
import { createBlankFlowData } from '/src/hooks/useFlowData.js'
import { serializeFlowData } from '/src/domain/flowDataTransfer.js'
import PlanRestoreScreen from '/src/features/flowtree/PlanRestoreScreen.jsx'

// Synthetic account and plan, isolated in this test tab. No Google requests or writes.
const key = 'flowtree-drive-session-v1'
const expired = new URLSearchParams(location.search).has('expired')
sessionStorage.setItem(key, JSON.stringify({ accessToken: 'synthetic', folderId: 'test', fileId: 'test', folderName: 'gpt', user: { emailAddress: 'test@example.invalid' } }))
window.google = { accounts: { oauth2: { initTokenClient() { throw Error('Retry must not request OAuth') } } } }
let requests = 0
let writes = 0
window.fetch = async (_url, options = {}) => {
  if (options.method && options.method !== 'GET') writes++
  if (++requests === 1) return new Response('', { status: expired ? 401 : 503 })
  return new Response(serializeFlowData(createBlankFlowData()))
}
const noop = () => {}
export default function Fixture() {
  const [plan, replaceData] = useState(createBlankFlowData)
  const [dialog, setDialog] = useState(null)
  const sync = useGoogleDrivePlan({ plan, replaceData, captureCurrentMonth: noop, dialog, setDialog, setPath: noop, notify: noop })
  return <><output id="result">{JSON.stringify({ status: sync.startupState, retry: !!sync.drive.retryRestore, sessionKept: !!sessionStorage.getItem(key), requests, writes })}</output>
    <PlanRestoreScreen theme="light" state={sync.startupState} error={sync.drive.error} onRetry={sync.connectDrive} retryRestore={sync.drive.retryRestore} configured={true} /></>
}
createRoot(document.getElementById('root')).render(<Fixture />)
