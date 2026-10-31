import { useEffect, useState } from 'react'
import DismissibleNotice from './DismissibleNotice'

// The parent keys this by status so each new save/error can be dismissed again.
export default function DriveSyncStatus({ status, onDismiss }) {
  const [dismissed, setDismissed] = useState(false)
  useEffect(() => {
    if (status !== 'saved') return undefined
    const timer = window.setTimeout(() => setDismissed(true), 2400)
    return () => window.clearTimeout(timer)
  }, [status])
  if (dismissed || !['saving', 'saved', 'error'].includes(status)) return null
  const [icon, message] = status === 'saving'
    ? ['sync', 'Saving to Google Drive…']
    : status === 'saved'
      ? ['cloud_done', 'Saved to Google Drive']
      : ['cloud_off', 'Google Drive save needs attention']
  return <DismissibleNotice className={`drive-sync-status is-${status}`} label="Dismiss Google Drive notification" onDismiss={() => { setDismissed(true); onDismiss?.() }}>
    <span className="material-symbols-rounded" aria-hidden="true">{icon}</span><span>{message}</span>
  </DismissibleNotice>
}
