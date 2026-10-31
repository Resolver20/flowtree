import { formatMoney } from '../../lib/money'

// One overview action and one set of totals at every screen size.
export default function MonthlyPlanHub({ monthlyDeductions, monthlyOutcome, onInspectPlan }) {
  return <>
    <div className="mobile-plan-heading monthly-plan-heading">
      <button type="button" className="mobile-plan-hub monthly-plan-hub" onClick={onInspectPlan} aria-label="View monthly plan information">
        <span className="material-symbols-rounded" aria-hidden="true">account_balance_wallet</span>
        <span className="mobile-plan-hub-info monthly-plan-hub-info material-symbols-rounded" aria-hidden="true">info</span>
      </button>
      <strong className="monthly-plan-title">Monthly plan</strong>
    </div>
    <div className="mobile-plan-summary monthly-plan-summary" aria-label="Monthly plan summary">
      <small className="is-deductions">Deductions <span>{formatMoney(monthlyDeductions)}</span></small>
      <small className="is-remaining">Available <span>{formatMoney(monthlyOutcome)}</span></small>
    </div>
  </>
}
