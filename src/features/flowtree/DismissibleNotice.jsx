import './DismissibleNotice.css'

export default function DismissibleNotice({ className, label = 'Dismiss notification', onDismiss, children }) {
  return <div className={className} role="status">
    <div className="notice-content">{children}</div>
    <button type="button" className="notice-dismiss" aria-label={label} onClick={onDismiss}>×</button>
  </div>
}
