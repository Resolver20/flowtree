import { useEffect, useRef } from 'react'

function candidateLabel(candidate) {
  const modified = new Date(candidate.modifiedTime)
  const modifiedText = Number.isNaN(modified.getTime()) ? 'Modified date unavailable' : `Modified ${modified.toLocaleString()}`
  return `${candidate.name} in ${candidate.folderName} — ${modifiedText}`
}

export default function DriveSyncDialog({ status, user, error, configured, setupRequired, restoreCandidates = [], onClose, onConnect, onAddAccount, onEditJson, onUseCurrentPlan, onCreateBlankPlan, onChooseRestoreCandidate, onRecoverDriveVersion }) {
  const ref = useRef(null)
  useEffect(() => {
    const opener = document.activeElement
    const element = ref.current
    element.showModal()
    return () => { element.close(); if (opener?.isConnected) opener.focus() }
  }, [])

  const connected = status === 'connected' || status === 'saving' || status === 'saved'
  const needsPlanChoice = setupRequired
  const needsRestoreChoice = restoreCandidates.length > 1
  const setupSaving = needsPlanChoice && status === 'saving'
  const restoreLoading = needsRestoreChoice && status === 'restoring'
  const choiceBusy = setupSaving || restoreLoading
  return <dialog ref={ref} className="modal" aria-labelledby="drive-dialog-title" onCancel={event => { event.preventDefault(); if (!choiceBusy) onClose() }}>
    <button type="button" className="close" aria-label="Close" disabled={choiceBusy} onClick={onClose}>×</button>
    <h2 id="drive-dialog-title">{needsRestoreChoice ? 'Choose a FlowTree plan' : needsPlanChoice ? 'Set up Google Drive' : 'Account'}</h2>
    {needsRestoreChoice ? <>
      <p>Multiple valid FlowTree plans were found in your gpt folder. Choose one to restore; they are listed newest first and no file will be changed by this selection.</p>
      {error && <span role="alert" className="field-error">{error}</span>}
      <div className="dialog-actions">{restoreCandidates.map(candidate => <button key={candidate.id} type="button" disabled={restoreLoading} onClick={() => onChooseRestoreCandidate(candidate.id)}>{candidateLabel(candidate)}</button>)}<button type="button" disabled={restoreLoading} onClick={onClose}>Not now</button></div>
    </> : needsPlanChoice ? <>
      <p>No valid FlowTree plan was found in your gpt folder. Your current plan will remain unchanged until you choose how to set up Drive.</p>
      {error && <span role="alert" className="field-error">{error}</span>}
      <div className="dialog-actions"><button type="button" disabled={setupSaving} onClick={onClose}>Not now</button><button type="button" disabled={setupSaving} onClick={onCreateBlankPlan}>Create empty Drive plan</button><button type="button" className="modal-submit" disabled={setupSaving} onClick={onUseCurrentPlan}>{setupSaving ? 'Saving…' : 'Save current plan to Drive'}</button></div>
    </> : connected ? <>
      <div className="account-card">
        {user?.photoLink ? <img src={user.photoLink} alt="" /> : <span className="overview-icon material-symbols-rounded" aria-hidden="true">account_circle</span>}
        <div><strong>{user?.displayName || 'Google account'}</strong><small>{user?.emailAddress || 'Signed in'}</small></div>
      </div>
      <div className="dialog-actions"><button type="button" onClick={onClose}>Done</button><button type="button" onClick={onRecoverDriveVersion}>Recover earlier version</button><button type="button" onClick={onEditJson}>Edit plan JSON</button><button type="button" className="modal-submit" onClick={onAddAccount}>Add or switch account</button></div>
    </> : <>
      <p>Sign in with Google to open your FlowTree plan from your Google Drive.</p>
      {error && <span role="alert" className="field-error">{error}</span>}
      {!configured && <span role="alert" className="field-error">Google Drive sign-in still needs its public OAuth client configuration.</span>}
      <div className="dialog-actions"><button type="button" onClick={onClose}>Not now</button><button type="button" className="modal-submit" disabled={!configured || status === 'connecting'} onClick={onConnect}>{status === 'connecting' ? 'Connecting…' : 'Sign in with Google'}</button></div>
    </>}
  </dialog>
}
