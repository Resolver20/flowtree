import { useEffect, useRef } from 'react'

export default function DriveSyncDialog({ status, user, error, onClose, onConnect, onDisconnect }) {
  const ref = useRef(null)
  useEffect(() => {
    const opener = document.activeElement
    const element = ref.current
    element.showModal()
    return () => { element.close(); if (opener?.isConnected) opener.focus() }
  }, [])

  const connected = status === 'connected' || status === 'saving' || status === 'saved'
  return <dialog ref={ref} className="modal" aria-labelledby="drive-dialog-title" onCancel={event => { event.preventDefault(); onClose() }}>
    <button type="button" className="close" aria-label="Close" onClick={onClose}>×</button>
    <h2 id="drive-dialog-title">Google Drive sync</h2>
    {connected ? <>
      <div className="card-overview"><span className="overview-icon material-symbols-rounded" aria-hidden="true">cloud_done</span><div><span>Signed in to Google Drive</span><strong>{user?.emailAddress || user?.displayName || 'Connected account'}</strong></div></div>
      <p>{status === 'saving' ? 'Saving your latest plan to your private gpt folder…' : status === 'saved' ? 'Your latest plan is saved in your private gpt folder.' : 'Your plan will sync automatically after changes.'}</p>
      <div className="dialog-actions"><button type="button" onClick={onClose}>Done</button><button type="button" className="delete-link" onClick={onDisconnect}>Disconnect</button></div>
    </> : <>
      <p>Sign in with Google to keep this plan in your own Drive. Flowtree creates a private <strong>gpt</strong> folder and stores one JSON backup there.</p>
      {error && <span role="alert" className="field-error">{error}</span>}
      <div className="dialog-actions"><button type="button" onClick={onClose}>Not now</button><button type="button" className="modal-submit" disabled={status === 'connecting'} onClick={onConnect}>{status === 'connecting' ? 'Connecting…' : 'Connect Google Drive'}</button></div>
    </>}
  </dialog>
}
