import React, { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { useGoogleDrivePlan } from '/src/hooks/useGoogleDrivePlan.js'
import { createBlankFlowData } from '/src/hooks/useFlowData.js'
import TreeHeader from '/src/features/flowtree/TreeHeader.jsx'
import DriveSyncDialog from '/src/features/flowtree/DriveSyncDialog.jsx'
import '/src/index.css'
import '/src/features/flowtree/EnergyExplorer.css'

// All OAuth and Drive responses are synthetic. No Google requests or writes.
let pendingScript
let requests = 0
let inUserGesture = false
let writes = 0
let loadAttempts = 0
const append = document.head.append.bind(document.head)
document.head.append = (...nodes) => {
  for (const node of nodes) {
    if (node.src === 'https://accounts.google.com/gsi/client') pendingScript = node
    else append(node)
  }
}
window.fetch = async (_url, options = {}) => {
  if (options.method && options.method !== 'GET') writes++
  return new Response(JSON.stringify({ user: { displayName: 'Test account' }, files: [] }))
}
const mode = new URLSearchParams(location.search).get('mode')
function finishLoading() {
  if (mode === 'load-error' && loadAttempts++ === 0) { pendingScript.onerror(); return }
  window.google = { accounts: { oauth2: { initTokenClient(options) {
    return { requestAccessToken() {
      requests++
      inUserGesture = navigator.userActivation.isActive
      if (mode === 'blocked') options.error_callback({ type: 'popup_failed_to_open' })
      else if (mode === 'closed') options.error_callback({ type: 'popup_closed' })
      else options.callback({ access_token: 'synthetic-token' })
    } }
  } } } }
  pendingScript.onload()
}
const noop = () => {}
export default function Fixture() {
  const [plan, replaceData] = useState(createBlankFlowData)
  const [dialog, setDialog] = useState(null)
  const sync = useGoogleDrivePlan({ plan, replaceData, captureCurrentMonth: noop, dialog, setDialog, setPath: noop, notify: noop })
  return <main className="energy-mode theme-light">
    <section style={{ margin: '100px 20px 100px', padding: 20 }}>
      <h1>First-login regression</h1><p>Synthetic Google and Drive responses only.</p>
      <button onClick={finishLoading}>Finish loading Google</button>
      <output id="result" style={{ display: 'block' }}>{JSON.stringify({ status: sync.drive.status, error: sync.drive.error, requests, inUserGesture, writes })}</output>
    </section>
    <TreeHeader profile={plan.profile} view="home" theme="light" breadcrumbs={[]} driveUser={sync.drive.user} driveStatus={sync.drive.status} driveError={sync.drive.error} driveConfigured={sync.driveConfigured} onConnectDrive={sync.connectDrive} onToggleTheme={noop} />
    {dialog && <DriveSyncDialog status={sync.drive.status} user={sync.drive.user} error={sync.drive.error} configured={sync.driveConfigured} setupRequired={sync.drive.setupRequired} onClose={sync.cancelDriveSetup} onConnect={sync.connectDrive} />}
  </main>
}
createRoot(document.getElementById('root')).render(<StrictMode><Fixture /></StrictMode>)
