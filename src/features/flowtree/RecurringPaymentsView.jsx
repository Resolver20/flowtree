import { monthlyAllocation } from '../../domain/flowTree'
import { formatMoney } from '../../lib/money'

function collectRecurringPayments(nodes, ancestors = []) {
  return nodes.flatMap(node => {
    const monthlyAmount = monthlyAllocation(node)
    const ownPayment = node.period === 'month' && monthlyAmount > 0
      ? [{ id: node.id, name: node.name, symbol: node.symbol || node.icon || 'event_repeat', monthlyAmount, dayOfMonth: node.dayOfMonth || 1, category: ancestors.at(-1) || 'Home' }]
      : []
    return [...ownPayment, ...collectRecurringPayments(node.children || [], [...ancestors, node.name])]
  })
}

function dayLabel(day) {
  const lastTwo = day % 100
  const suffix = lastTwo >= 11 && lastTwo <= 13 ? 'th' : day % 10 === 1 ? 'st' : day % 10 === 2 ? 'nd' : day % 10 === 3 ? 'rd' : 'th'
  return `${day}${suffix}`
}

export default function RecurringPaymentsView({ tree, onSaveDay }) {
  const payments = collectRecurringPayments(tree).sort((left, right) => left.dayOfMonth - right.dayOfMonth || left.name.localeCompare(right.name))
  const monthlyTotal = payments.reduce((total, payment) => total + payment.monthlyAmount, 0)

  return <section className="recurring-view" aria-label="Recurring payments">
    <header className="recurring-header"><div><span className="eyebrow">RECURRING PAYMENTS</span><h1>Monthly payment calendar</h1><p>Every active monthly amount in your plan appears here. Choose the usual day of the month for each payment; its amount remains part of the same Home plan.</p></div></header>
    {!payments.length ? <div className="recurring-empty"><span className="material-symbols-rounded" aria-hidden="true">event_repeat</span><strong>No recurring payments yet</strong><p>Add a monthly amount to any plan card and it will appear here.</p></div> : <>
      <div className="recurring-summary"><div><span>Recurring payments</span><strong>{payments.length}</strong><small>Active monthly plan items</small></div><div><span>Monthly amount in Home</span><strong>{formatMoney(monthlyTotal)}</strong><small>Combined recurring contributions</small></div></div>
      <div className="recurring-list">{payments.map(payment => <article key={payment.id} className="recurring-card"><span className="material-symbols-rounded" aria-hidden="true">{payment.symbol}</span><div className="recurring-card-main"><strong>{payment.name}</strong><small>{payment.category}</small></div><strong className="recurring-amount">{formatMoney(payment.monthlyAmount)} <small>/ month</small></strong><label>Payment day<select value={payment.dayOfMonth} onChange={event => onSaveDay(payment.id, Number(event.target.value))}>{Array.from({ length: 31 }, (_, index) => index + 1).map(day => <option key={day} value={day}>{dayLabel(day)}</option>)}</select></label></article>)}</div>
    </>}
  </section>
}
