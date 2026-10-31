import { useEffect, useRef } from 'react'
import { bindDialogViewport } from './dialogViewport'

export default function InstallDialog({ onClose }) {
  const ref = useRef(null)
  const iphone = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  useEffect(() => {
    const opener = document.activeElement
    const dialog = ref.current
    const release = bindDialogViewport(dialog)
    dialog.showModal()
    return () => { release(); dialog.close(); if (opener?.isConnected) opener.focus() }
  }, [])
  return <dialog className="modal" ref={ref} aria-labelledby="install-title" onCancel={event => { event.preventDefault(); onClose() }}>
    <button className="close" aria-label="Close" onClick={onClose}>×</button>
    <h2 id="install-title">Install Flowtree</h2>
    <p>{iphone ? 'In Safari, open Share, choose Add to Home Screen, then tap Add.' : 'Open your browser menu and choose Install app or Add to Home screen. On a computer, look for Install Flowtree in the address bar.'}</p>
    <p>Open Flowtree from its icon like an app. Internet is needed to sign in, restore your plan, and save to Google Drive.</p>
    <div className="dialog-actions"><button className="modal-submit" onClick={onClose}>Got it</button></div>
  </dialog>
}
