import { monthlyAllocation, monthlyTotal } from './flowTree.js'

/**
 * Preview the monthly plan in priority order; never move or persist money.
 * Sibling array order is the current priority. A node reserves its own amount
 * before passing its remaining share to children. Parent/child totals therefore
 * describe the same money, not additional allocations.
 * Targets are monthly equivalents, including annual bills divided by twelve.
 */
export function allocateEnergy(nodes, available) {
  let remaining = Math.max(0, Number(available) || 0)
  const allocations = nodes.map(node => {
    const target = monthlyTotal(node)
    const allocated = Math.min(remaining, target)
    remaining -= allocated
    const own = Math.min(allocated, monthlyAllocation(node))
    return {
      id: node.id, target, allocated,
      ratio: target > 0 ? allocated / target : 0,
      children: allocateEnergy(node.children || [], allocated - own).allocations,
    }
  })
  return { allocations, remaining }
}

/** Follow the same ID path used by the tree navigation, keeping funding honest
 * when opening a partially funded parent: children inherit its share, not salary.
 */
export function energyAtPath(allocations, path) {
  let current = null
  for (const id of path) {
    current = allocations.find(item => item.id === id)
    if (!current) return null
    allocations = current.children
  }
  return current
}
