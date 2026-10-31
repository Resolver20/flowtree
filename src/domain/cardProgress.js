import { annualTargetProgress } from './flowTree.js'

// Combine only each node's own yearly target, never a parent's derived total.
export function cardProgress(node, funding = {}, today = new Date()) {
  function annualTotals(item) {
    const own = annualTargetProgress(item, today)
    return (item.children || []).reduce((sum, child) => {
      const next = annualTotals(child)
      return { target: sum.target + next.target, saved: sum.saved + next.saved, hasAnnual: sum.hasAnnual || next.hasAnnual }
    }, { target: own?.target || 0, saved: own?.saved || 0, hasAnnual: Boolean(own) })
  }
  const totals = annualTotals(node)
  const ratio = totals.hasAnnual ? (totals.target > 0 ? totals.saved / totals.target : 0) : (funding.target > 0 ? funding.allocated / funding.target : 0)
  return { ratio: Math.max(0, Math.min(1, ratio || 0)), label: totals.hasAnnual ? 'of yearly targets saved' : 'of monthly plan allocated' }
}
