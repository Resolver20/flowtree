import { monthlyAllocation } from './flowTree.js'

export function collectRecurringPayments(nodes, ancestors = []) {
  return nodes.flatMap(node => {
    const monthlyAmount = monthlyAllocation(node)
    const ownPayment = node.period === 'month' && monthlyAmount > 0
      ? [{ id: node.id, name: node.name, symbol: node.symbol || node.icon || 'event_repeat', monthlyAmount, dayOfMonth: node.dayOfMonth || 1, category: ancestors.at(-1) || 'Home' }]
      : []
    return [...ownPayment, ...collectRecurringPayments(node.children || [], [...ancestors, node.name])]
  })
}

export function recurringPaymentSummary(tree) {
  const payments = collectRecurringPayments(tree).sort((left, right) => left.dayOfMonth - right.dayOfMonth || left.name.localeCompare(right.name))
  const paymentsByDay = {}
  let monthlyTotal = 0
  for (const payment of payments) {
    monthlyTotal += payment.monthlyAmount
    const day = payment.dayOfMonth
    if (!paymentsByDay[day]) paymentsByDay[day] = []
    paymentsByDay[day].push(payment)
  }
  return { payments, paymentsByDay, monthlyTotal }
}
