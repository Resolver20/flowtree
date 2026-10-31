import { useEffect, useState } from 'react'
import App from '../App'
import { readDeviceTheme } from '../domain/devicePreferences'
import DismissibleNotice from '../features/flowtree/DismissibleNotice'
import './pwa.css'

export function PwaStatusNotice({ kind }) {
  const [dismissed, setDismissed] = useState(false)
  if (dismissed) return null
  return <DismissibleNotice className="pwa-status" label="Dismiss app notification" onDismiss={() => setDismissed(true)}>{kind === 'offline'
    ? 'Offline. Keep this window open to preserve edits. Reconnect before saving to Drive.'
    : 'Update ready. Save your changes, then close all Flowtree windows and reopen.'}</DismissibleNotice>
}

export default function PwaShell() {
  const [online, setOnline] = useState(() => navigator.onLine)
  const [started, setStarted] = useState(() => navigator.onLine)
  const [updateReady, setUpdateReady] = useState(false)
  useEffect(() => {
    const sync = () => setOnline(navigator.onLine)
    window.addEventListener('online', sync)
    window.addEventListener('offline', sync)
    return () => { window.removeEventListener('online', sync); window.removeEventListener('offline', sync) }
  }, [])
  useEffect(() => {
    if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return undefined
    let active = true
    let registration
    let worker
    const changed = () => { if (active && registration?.waiting && navigator.serviceWorker.controller) setUpdateReady(true) }
    const found = () => {
      worker?.removeEventListener('statechange', changed)
      worker = registration.installing
      worker?.addEventListener('statechange', changed)
    }
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL, updateViaCache: 'none' }).then(result => {
      if (!active) return
      registration = result
      changed()
      registration.addEventListener('updatefound', found)
      found()
    }).catch(() => { /* Installation is optional; ordinary browser use continues. */ })
    return () => { active = false; registration?.removeEventListener('updatefound', found); worker?.removeEventListener('statechange', changed) }
  }, [])
  if (!started) return <main className={`pwa-offline-screen theme-${readDeviceTheme(window)}`}>
    <img src={`${import.meta.env.BASE_URL}icons/icon-192.png`} alt="" width="72" height="72" />
    <h1>{online ? 'Ready to open Flowtree' : 'You’re offline'}</h1>
    <p>Connect to the internet to open your Google Drive plan.</p>
    <button disabled={!online} onClick={() => setStarted(true)}>Open Flowtree</button>
  </main>
  const noticeKind = !online ? 'offline' : updateReady ? 'update' : null
  return <><App />{noticeKind && <PwaStatusNotice key={noticeKind} kind={noticeKind} />}</>
}
