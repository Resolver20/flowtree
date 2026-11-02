import { expenseTypeFor } from './expenseType.js'
import { totalChildren, totalExpectedAnnualSavings } from './flowTree.js'

export function sinkingFundsOverview(nodes, today = new Date()) {
  const hasTarget = items => items.some(item => expenseTypeFor(item) === 'upcoming' || hasTarget(item.children || []))
  return {
    monthly: totalChildren(nodes, today),
    plannedSaved: totalExpectedAnnualSavings(nodes, today),
    hasTargets: hasTarget(nodes),
  }
}

// Keep ancestors for hierarchy, but exclude their own current expense amounts.
// Untyped descendants retain the legacy inherited behavior; explicit choices win.
export function selectSinkingFunds(nodes, withinTarget = false) {
  return nodes.flatMap(node => {
    if (['goals', 'growth', 'provisions', 'obligations'].includes(node.id) || node.loan || node.investment) return []
    const upcoming = expenseTypeFor(node, withinTarget ? 'upcoming' : 'current') === 'upcoming'
    const children = selectSinkingFunds(node.children || [], upcoming)
    if (!upcoming && !children.length) return []
    return [{ ...node, ...(upcoming ? {} : { amount: 0, savedAmount: 0 }), children }]
  })
}
