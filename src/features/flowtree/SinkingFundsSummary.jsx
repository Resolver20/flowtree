import { sinkingFundsOverview } from '../../domain/sinkingFunds'
import { formatMoney } from '../../lib/money'

export default function SinkingFundsSummary({ tree, isExample = false }) {
  const { monthly, plannedSaved, hasTargets } = sinkingFundsOverview(tree)
  const hint = !hasTargets
    ? 'Add a bill or goal with a target date to see how much to save each month.'
    : monthly === 0
      ? 'No saving is needed this month. Open a card to check its amount, dates or status.'
      : plannedSaved === 0
        ? isExample
          ? 'This example starts this month, so its planned savings are still ₹0.'
          : 'Starting at ₹0? Save the monthly amount above toward the cards below.'
        : 'Planned savings show how much your schedule adds up to by now.'
  return <section className="sinking-status" aria-label="Sinking funds summary">
    <div className="sinking-intro"><h2>Save a little for bigger costs</h2><p>A sinking fund is a saving plan for a future bill or goal, like insurance or a holiday.</p></div>
    <div className="sinking-totals" aria-live="polite">
      <div className="sinking-saved"><span>Save each month</span><strong>{formatMoney(monthly)}</strong></div>
      <div className="sinking-saved is-progress"><span>Planned savings so far</span><strong>{formatMoney(plannedSaved)}</strong></div>
    </div>
    <p className="sinking-hint">{hint}</p>
    <small>These are planning figures, not money in your bank.</small>
  </section>
}
