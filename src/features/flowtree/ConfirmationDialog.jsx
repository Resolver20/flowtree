import { useEffect, useId, useRef } from 'react'
import { bindDialogViewport } from './dialogViewport'

export default function ConfirmationDialog({ confirmation }) {
  const ref = useRef(null)
  const titleId = useId()
  const { request, answer } = confirmation
  useEffect(() => {
    const opener = document.activeElement
    const element = ref.current
    const release = bindDialogViewport(element)
    element.showModal()
    element.querySelector('.close').focus({ preventScroll: true })
    return () => { release(); element.close(); if (opener?.isConnected) opener.focus({ preventScroll: true }) }
  }, [])
  return <dialog ref={ref} className="modal" aria-labelledby={titleId} onClick={event => event.stopPropagation()} onCancel={event => { event.preventDefault(); answer(false) }}>
    <button type="button" className="close" aria-label="Close" onClick={() => answer(false)}>×</button>
    <h2 id={titleId}>{request.title}</h2>
    <p>{request.message}</p>
    <div className="dialog-actions"><button type="button" onClick={() => answer(false)}>Cancel</button><button type="button" className="danger-button" onClick={() => answer(true)}>{request.confirmLabel}</button></div>
  </dialog>
}
