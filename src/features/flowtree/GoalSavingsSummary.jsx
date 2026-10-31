import { goalSavingsPlan } from '../../domain/goalSavingsPlan'
import { formatMoney } from '../../lib/money'

export default function GoalSavingsSummary({ goal }) {
  const plan = goalSavingsPlan(goal)
  return <div className="goal-preview" aria-label="Savings plan" aria-live="polite">
    <span>Expected saved</span><strong>{formatMoney(plan.saved)}</strong>
    <span>Remaining</span><strong>{formatMoney(plan.remaining)}</strong>
    <span>Required / month</span><strong>{formatMoney(plan.monthlyRequired)}</strong>

  </div>
}
