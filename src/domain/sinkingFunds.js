import { totalChildren, totalExpectedAnnualSavings } from './flowTree.js'

export function sinkingFundsOverview(nodes, today = new Date()) {
  const hasTarget = items => items.some(item => item.period === 'year' || hasTarget(item.children || []))
  return {
    monthly: totalChildren(nodes, today),
    plannedSaved: totalExpectedAnnualSavings(nodes, today),
    hasTargets: hasTarget(nodes),
  }
}

// Filter the already-ordered Home tree without changing record values or the
// relative order of siblings. Once a dated target is included, keep its entire
// branch so adding a child never makes that child disappear in Sinking funds.
export function selectSinkingFunds(nodes, withinTarget = false) {
  return nodes.flatMap(node => {
    const keepBranch = withinTarget || node.period === 'year'
    const children = selectSinkingFunds(node.children || [], keepBranch)
    return keepBranch || children.length ? [{ ...node, children }] : []
  })
}
