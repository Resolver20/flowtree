import { useEffect, useRef } from 'react'

export default function DriveRevisionDialog({ revisions, onClose, onRestore }) {
  const ref = useRef(null)
  useEffect(() => {
    const element = ref.current
    element.showModal()
    return () => element.close()
  }, [])

  return <dialog ref={ref} className="modal" aria-labelledby="drive-revisions-title" onCancel={event => { event.preventDefault(); onClose() }}>
    <button type="button" className="close" aria-label="Close" onClick={onClose}>×</button>
    <h2 id="drive-revisions-title">Recover an earlier Drive version</h2>
    <p>Changes are compared with the preceding available saved version. Restoring replaces the open plan; use Save to Google Drive when you want to save it.</p>
    <div className="dialog-actions drive-version-list">{revisions.map(revision => {
      const modified = new Date(revision.modifiedTime)
      const label = Number.isNaN(modified.getTime()) ? 'Date unavailable' : modified.toLocaleString()
      return <button type="button" key={revision.id} onClick={() => onRestore(revision.id)}>
        <strong>Restore version from {label}</strong>
        <span>{(revision.changes || ['Change details unavailable']).join(' · ')}</span>
      </button>
    })}</div>
  </dialog>
}

