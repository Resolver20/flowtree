import { normalizeNodeStatus } from './flowTree.js'

export function monthlyPlanShare({ amount, income, tree, path }) {
  let nodes = tree
  let excluded = false
  for (const id of path) {
    const node = nodes.find(candidate => candidate.id === id)
    if (!node || normalizeNodeStatus(node.status) === 'inactive') { excluded = true; break }
    nodes = node.children || []
  }
  const percentage = !excluded && income > 0 && amount > 0 ? amount / income * 100 : 0
  return { percentage, label: percentage > 0 && percentage < 0.1 ? '<0.1%' : `${Math.round(percentage * 10) / 10}%` }
}
