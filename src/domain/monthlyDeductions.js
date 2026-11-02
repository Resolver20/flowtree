import { monthlyAllocation, normalizeNodeStatus } from './flowTree.js'
import { expenseTypeFor } from './expenseType.js'

// Count each card's own contribution once, retaining inactive-branch semantics.
export function monthlyDeductionBreakdown(nodes, today = new Date()) {
  const totals = { current: 0, upcoming: 0 }
  function visit(items, inherited = 'current') {
    for (const node of items) {
      if (normalizeNodeStatus(node.status) === 'inactive') continue
      const fallback = ['goals', 'growth', 'provisions'].includes(node.id) || node.investment
        ? 'upcoming' : node.loan ? 'current' : inherited
      const type = expenseTypeFor(node, fallback)
      totals[type] += monthlyAllocation(node, today)
      visit(node.children || [], type)
    }
  }
  visit(nodes)
  return { ...totals, total: totals.current + totals.upcoming }
}
