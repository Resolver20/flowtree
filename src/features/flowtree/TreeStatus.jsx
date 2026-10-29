import { formatMoney } from '../../lib/money'

export default function TreeStatus({ demo, mobileHome, sinking, flow, available, monthlyOutcome, planned, status }) {
  const planUsed = sinking ? Math.max(0, available - flow.remaining) : planned
  const remaining = sinking ? flow.remaining : monthlyOutcome
  const usedPercent = available > 0 ? Math.round(planUsed / available * 100) : 0
  const remainingPercent = available > 0 ? Math.round(remaining / available * 100) : 0
  const remainingLabel = remaining < 0 ? 'Over-planned' : 'Remaining this month'

  return <footer className={`energy-status${mobileHome ? ' is-mobile-home' : ''}`}>
    <div className="summary-heading">
      <strong>{sinking ? 'Sinking funds outlook' : 'Monthly outlook'}</strong>
      <span aria-live="polite">{status}</span>
    </div>
    <div className="plan-totals" aria-label="Monthly plan summary">
      <div><span>Planned deductions</span><strong>{formatMoney(planUsed)} <small>{usedPercent}%</small></strong></div>
      <div><span>{remainingLabel}</span><strong>{formatMoney(remaining)} <small>{remainingPercent}%</small></strong></div>
    </div>
    <small>{demo ? 'Sample income · No changes to your saved plan' : sinking ? 'Monthly set-asides for yearly targets' : 'After planned targets and safety buffer'}</small>
  </footer>
}
