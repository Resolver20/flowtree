import { monthlyTotal, normalizeNodeStatus } from '../../domain/flowTree.js'

export function goalCardPreview(node, isGoal, allocatedTarget, today = new Date()) {
  return {
    monthlyAmount: isGoal ? monthlyTotal({ ...node, status: 'active' }, today) : allocatedTarget,
    inactive: normalizeNodeStatus(node.status) === 'inactive',
  }
}
