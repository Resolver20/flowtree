import { formatMoney } from '../../lib/money'

export default function TreeStatus({ demo, mobileHome, monthlyOutcome, planned }) {

  return <footer className={`energy-status${mobileHome ? ' is-mobile-home' : ''}`}>
    <div className="summary-heading">
      <strong>Monthly outlook</strong>
    </div>
    <div className="plan-totals" aria-label="Monthly plan summary">
      <div><span>Deductions</span><strong>{formatMoney(planned)}</strong></div>
      <div><span>Available</span><strong>{formatMoney(monthlyOutcome)}</strong></div>
    </div>
    <small>{demo ? 'Sample income · No changes to your saved plan' : 'After planned targets and safety buffer'}</small>
  </footer>
}
