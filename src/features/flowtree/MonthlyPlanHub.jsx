import { formatMoney } from '../../lib/money'

// One overview action and one set of totals at every screen size.
export default function MonthlyPlanHub({ monthlyDeductions, upcomingDeductions = 0, monthlyOutcome, onInspectPlan }) {
  return <>
    <div className="mobile-plan-heading monthly-plan-heading">
      <button type="button" className="mobile-plan-hub monthly-plan-hub" onClick={onInspectPlan} aria-label="View monthly plan information">
        <span className="material-symbols-rounded" aria-hidden="true">account_balance_wallet</span>
        <span className="mobile-plan-hub-info monthly-plan-hub-info material-symbols-rounded" aria-hidden="true">info</span>
      </button>
      <strong className="monthly-plan-title">Monthly plan</strong>
    </div>
    <div className="mobile-plan-summary monthly-plan-summary" aria-label="Monthly plan summary">
      <small className="is-deductions is-current">Current expenses <span>{formatMoney(monthlyDeductions - upcomingDeductions)}</span><em>Spending this month</em></small>
      <small className="is-deductions is-upcoming">Planned expenses <span>{formatMoney(upcomingDeductions)}</span><em>Set aside for later</em></small>
      <small className="is-remaining">Money left <span>{formatMoney(monthlyOutcome)}</span><em>After expenses &amp; buffer</em></small>
    </div>
  </>
}
