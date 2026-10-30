import { useEffect, useRef, useState } from 'react'

export default function DriveRevisionDialog({ revisions, loading, error, onRetry, onClose, onRestore }) {
  const ref = useRef(null)
  const [selected, setSelected] = useState('current')
  useEffect(() => {
    const opener = document.activeElement
    const element = ref.current
    element.showModal()
    return () => { element.close(); if (opener?.isConnected) opener.focus() }
  }, [])

  return <dialog ref={ref} className="modal drive-recovery-dialog" aria-labelledby="drive-revisions-title" onCancel={event => { event.preventDefault(); onClose() }}>
    <button type="button" className="close" aria-label="Close" onClick={onClose}>×</button>
    <h2 id="drive-revisions-title">Plan versions</h2>
    <p>Keep your current plan or choose an earlier saved version. Loading a version only changes this tab until you press Save.</p>
    <fieldset className="drive-version-options">
      <legend className="version-section-label">Choose a version</legend>
      <label className={`drive-version-option${selected === 'current' ? ' is-selected' : ''}`}>
        <input type="radio" name="drive-version" value="current" checked={selected === 'current'} onChange={() => setSelected('current')} />
        <span><strong>Current plan</strong><small>Your plan as it is in this tab, including unsaved changes.</small></span>
      </label>
      <div className="version-section-label">Earlier Drive versions · up to 5</div>
      {loading && <p className="version-message" role="status">Loading saved versions… You can keep your current plan while this loads.</p>}
      {error && <div className="version-message"><p role="alert">{error}</p><button type="button" onClick={onRetry}>Try again</button></div>}
      {!loading && !error && !revisions.length && <p className="version-message" role="status">No earlier readable versions were found.</p>}
      {!loading && !error && revisions.map(revision => {
      const modified = new Date(revision.modifiedTime)
      const label = Number.isNaN(modified.getTime()) ? 'Date unavailable' : modified.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
      return <label className={`drive-version-option${selected === revision.id ? ' is-selected' : ''}`} key={revision.id}>
        <input type="radio" name="drive-version" value={revision.id} checked={selected === revision.id} onChange={() => setSelected(revision.id)} />
        <span><strong>{label}</strong><small>{(revision.changes || ['Change details unavailable']).join(' · ')}</small></span>
      </label>
    })}</fieldset>
    {!loading && revisions.length > 0 && <p className="version-comparison-note">Change details compare each version with its preceding available saved version.</p>}
    <div className="dialog-actions"><button type="button" className={selected === 'current' ? 'modal-submit' : ''} onClick={onClose}>Keep current version</button>{selected !== 'current' && <button type="button" className="modal-submit" onClick={() => onRestore(selected)} disabled={loading || Boolean(error) || !revisions.some(revision => revision.id === selected)}>Load selected version</button>}</div>
  </dialog>
}

