// Older plans infer a type from frequency until the user makes a choice.
export function expenseTypeFor(node, inherited = 'current') {
  if (node?.expenseType === 'current' || node?.expenseType === 'upcoming') return node.expenseType
  if (['goals', 'growth', 'provisions'].includes(node?.id) || node?.investment) return 'upcoming'
  if (node?.loan) return 'current'
  return node?.period === 'year' ? 'upcoming' : inherited
}
