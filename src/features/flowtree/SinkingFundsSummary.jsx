import { totalExpectedAnnualSavings } from '../../domain/flowTree'
import { formatMoney } from '../../lib/money'

export default function SinkingFundsSummary({ tree }) {
  return <section className="energy-status sinking-status" aria-label="Sinking funds summary">
    <div className="summary-heading"><strong>Sinking funds outlook</strong></div>
    <div className="sinking-saved" aria-live="polite"><span>Expected saved</span><strong>{formatMoney(totalExpectedAnnualSavings(tree))}</strong></div>
  </section>
}
