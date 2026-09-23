import { formatMoney } from '../../lib/money'

export default function TreeStatus({ demo, flow, available, status }) {
  const planUsed = Math.max(0, available - flow.remaining)
  const usedPercent = available > 0 ? Math.round(planUsed / available * 100) : 0
  const remainingPercent = available > 0 ? Math.round(flow.remaining / available * 100) : 0

  return <footer className="energy-status">
    <div className="summary-heading">
      <strong>Monthly outlook</strong>
      <span aria-live="polite">{status}</span>
    </div>
    <div className="plan-totals" aria-label="Monthly plan summary">
      <div><span>Planned deductions</span><strong>{formatMoney(planUsed)} <small>{usedPercent}%</small></strong></div>
      <div><span>Remaining this month</span><strong>{formatMoney(flow.remaining)} <small>{remainingPercent}%</small></strong></div>
    </div>
    <small>{demo ? 'Sample income · No changes to your saved plan' : 'After planned targets and safety buffer'}</small>
  </footer>
}
