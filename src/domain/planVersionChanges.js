function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue)
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, stableValue(value[key])]))
  return value
}

function itemsIn(plan) {
  const items = new Map()
  const add = (key, name, value) => items.set(key, { name, value: JSON.stringify(stableValue(value)) })
  const walk = (nodes, parent = '') => nodes.forEach(({ children = [], ...node }) => {
    add(`node:${node.id}`, node.name, { ...node, parent })
    walk(children, node.id)
  })
  walk(plan.tree || [])
  for (const item of plan.incomeSources || []) add(`income:${item.id}`, item.name, item)
  for (const { entries = [], ...ledger } of plan.generalLedgers || []) {
    add(`ledger:${ledger.id}`, ledger.name, ledger)
    for (const entry of entries) add(`entry:${ledger.id}:${entry.id}`, `${ledger.name}: ${entry.description || 'Expense'}`, entry)
  }
  for (const [month, snapshot] of Object.entries(plan.monthlyHistory || {})) add(`month:${month}`, `Monthly payments ${month}`, snapshot)
  add('profile', 'Profile', plan.profile)
  add('buffer', 'Safety buffer', plan.buffer)
  return items
}

// Compare the saved version with its preceding available version, never the live draft.
export function planVersionChanges(previous, current) {
  if (!previous) return ['Earlier version unavailable for comparison']
  const before = itemsIn(previous)
  const after = itemsIn(current)
  const changes = []
  for (const [key, item] of after) {
    const old = before.get(key)
    if (!old) changes.push(`Added: ${item.name}`)
    else if (old.value !== item.value) changes.push(`Modified: ${old.name === item.name ? item.name : `${old.name} → ${item.name}`}`)
  }
  for (const [key, item] of before) if (!after.has(key)) changes.push(`Deleted: ${item.name}`)
  return changes.length ? changes : ['No plan changes']
}
