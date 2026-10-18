import { useEffect, useRef } from 'react'

export default function DriveSyncDialog({ status, user, error, configured, onClose, onConnect, onAddAccount, onEditJson }) {
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
    <h2 id="drive-dialog-title">Account</h2>
    {connected ? <>
      <div className="account-card">
        {user?.photoLink ? <img src={user.photoLink} alt="" /> : <span className="overview-icon material-symbols-rounded" aria-hidden="true">account_circle</span>}
        <div><strong>{user?.displayName || 'Google account'}</strong><small>{user?.emailAddress || 'Signed in'}</small></div>
      </div>
      <div className="dialog-actions"><button type="button" onClick={onClose}>Done</button><button type="button" onClick={onEditJson}>Edit plan JSON</button><button type="button" className="modal-submit" onClick={onAddAccount}>Add or switch account</button></div>
    </> : <>
      <p>Sign in with Google to open your FlowTree plan from your Google Drive.</p>
      {error && <span role="alert" className="field-error">{error}</span>}
      {!configured && <span role="alert" className="field-error">Google Drive sign-in still needs its public OAuth client configuration.</span>}
      <div className="dialog-actions"><button type="button" onClick={onClose}>Not now</button><button type="button" className="modal-submit" disabled={!configured || status === 'connecting'} onClick={onConnect}>{status === 'connecting' ? 'Connecting…' : 'Sign in with Google'}</button></div>
    </>}
  </dialog>
}
