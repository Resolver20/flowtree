/**
 * A node can contain its own allocation and any number of child nodes.
 * A parent's displayed total includes its own allocation plus its children.
 * This keeps the model usable for both a simple bill and a deeper branch.
 */

export const FLOW_GROUPS = [
  { id: 'needs', name: 'Cash Flow', note: 'Day-to-day needs', icon: '⌂', tone: 'blue' },
  { id: 'obligations', name: 'Debt Commitments', note: 'EMIs and fixed commitments', icon: '▰', tone: 'coral' },
  { id: 'provisions', name: 'Emergency Fund', note: 'Money for unexpected shocks', icon: '◴', tone: 'gold' },
  { id: 'protection', name: 'Risk Protection', note: 'Insurance protection', icon: '✳', tone: 'violet' },
  { id: 'tax', name: 'Tax Obligations', note: 'Planned annual payments', icon: '⌁', tone: 'gold' },
  { id: 'goals', name: 'Life goals', note: 'Your next chapters', icon: '⚑', tone: 'pink' },
  { id: 'growth', name: 'Long-Term Growth', note: 'Future wealth building', icon: '↗', tone: 'green' },
]

export const SUBSCRIPTION_NAMES = new Set(['Google Drive', 'Apple One', 'GPT', 'Netflix'])
export const NODE_STATUSES = ['dormant', 'seeded', 'active', 'funded']

function makeNode({ id, name, amount = 0, savedAmount = 0, period = 'month', status = 'active', icon = '✦', tone = 'blue', note = '', children = [] }) {
  return { id, name, amount, savedAmount, period, status, icon, tone, note, children }
}

function createGroupNodes() {
  return FLOW_GROUPS.map(group => makeNode({
    ...group,
    children: group.id === 'needs'
      ? [makeNode({ id: 'subscriptions', name: 'Subscriptions', note: 'Digital services', icon: '◈', tone: 'blue' })]
      : [],
  }))
}

const startingBuckets = [
  ['seed-0', 'Current bill', 1000, 'month', 'needs'],
  ['seed-1', 'Mobile recharge', 4000, 'year', 'needs'],
  ['seed-2', 'Google Drive', 150, 'month', 'needs'],
  ['seed-3', 'Apple One', 200, 'month', 'needs'],
  ['seed-4', 'GPT', 2000, 'month', 'needs'],
  ['seed-5', 'Netflix', 200, 'month', 'needs'],
  ['seed-6', 'Loan EMI', 20000, 'month', 'obligations'],
  ['seed-7', 'Property tax', 4000, 'year', 'tax'],
  ['seed-8', 'Personal insurance', 3000, 'year', 'protection'],
  ['seed-9', 'Car insurance', 9000, 'year', 'protection'],
  ['seed-10', 'Bike insurance', 3000, 'year', 'protection'],
  ['seed-11', 'Emergency RD', 11000, 'month', 'provisions'],
].map(([id, name, amount, period, group]) => ({ id, name, amount, period, group, status: 'active' }))

export function monthsUntilTarget(dueDate, today = new Date()) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dueDate || '')
  if (!match) return 12
  const [, year, month, day] = match.map(Number)
  const due = new Date(year, month - 1, day)
  if (Number.isNaN(due.getTime())) return 12
  const monthDifference = (year - today.getFullYear()) * 12 + (month - 1 - today.getMonth())
  return Math.max(1, monthDifference)
}

export function expectedAnnualSavings(node, today = new Date()) {
  const target = Math.max(0, Number(node.amount) || 0)
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(node.dueDate || '')
  if (!match) return Math.min(target, Math.max(0, Number(node.savedAmount) || 0))
  const [, year, month] = match.map(Number)
  const monthsToDue = (year - today.getFullYear()) * 12 + (month - 1 - today.getMonth())
  const completedMonths = 12 - Math.min(12, Math.max(0, monthsToDue))
  return target * completedMonths / 12
}

export function monthlyAllocation(node, today = new Date()) {
  if (node.status === 'dormant' || node.status === 'funded') return 0
  const amount = Math.max(0, Number(node.amount) || 0)
  if (node.period !== 'year') return amount
  const saved = expectedAnnualSavings(node, today)
  return (amount - saved) / monthsUntilTarget(node.dueDate, today)
}

export function annualTargetProgress(node, today = new Date()) {
  if (node.period !== 'year') return null
  const target = Math.max(0, Number(node.amount) || 0)
  const saved = expectedAnnualSavings(node, today)
  return { target, saved, ratio: target > 0 ? saved / target : 0 }
}

export function totalExpectedAnnualSavings(nodes, today = new Date()) {
  return nodes.reduce((total, node) => {
    const ownExpectedSavings = node.period === 'year' ? expectedAnnualSavings(node, today) : 0
    return total + ownExpectedSavings + totalExpectedAnnualSavings(node.children || [], today)
  }, 0)
}

export function monthlyTotal(node, today = new Date()) {
  if (node.status === 'dormant' || node.status === 'funded') return 0
  return monthlyAllocation(node, today) + (node.children || []).reduce((sum, child) => sum + monthlyTotal(child, today), 0)
}

export function totalChildren(nodes, today = new Date()) {
  return nodes.reduce((sum, node) => sum + monthlyTotal(node, today), 0)
}

export function sortTreeByMonthlyTotal(nodes, today = new Date()) {
  return nodes
    .map((node, index) => ({
      node: { ...node, children: sortTreeByMonthlyTotal(node.children || [], today) },
      index,
      total: monthlyTotal(node, today),
    }))
    .sort((left, right) => right.total - left.total || left.index - right.index)
    .map(item => item.node)
}

/** Build the initial tree, or migrate saved buckets from the earlier flat model. */
export function createTreeFromBuckets(buckets = startingBuckets) {
  const tree = createGroupNodes()

  for (const bucket of buckets) {
    const group = tree.find(node => node.id === bucket.group)
    if (!group) continue

    const child = makeNode({
      id: bucket.id,
      name: bucket.name,
      amount: bucket.amount,
      savedAmount: bucket.savedAmount || 0,
      period: bucket.period,
      status: bucket.status || 'active',
      icon: '✦',
      tone: group.tone,
    })

    // Existing subscription amounts move under one shared parent.
    const isSubscription = group.id === 'needs' && SUBSCRIPTION_NAMES.has(bucket.name)
    if (isSubscription) {
      group.children.find(node => node.id === 'subscriptions').children.push(child)
    } else {
      group.children.push(child)
    }
  }
  return tree
}

/** Move the original starter plan into the FPSB-style planning areas without
 * touching any custom nodes the person may have added. */
export function migrateFinancialCategories(tree) {
  const roots = new Map(tree.map(node => [node.id, { ...node, children: [...(node.children || [])] }]))
  const defaults = new Map(FLOW_GROUPS.map(group => [group.id, group]))

  for (const [id, group] of defaults) {
    const existing = roots.get(id)
    roots.set(id, existing ? { ...existing, name: group.name, note: group.note, icon: group.icon, tone: group.tone } : makeNode(group))
  }

  const emergency = roots.get('provisions')
  const insurance = emergency.children.filter(node => /insurance/i.test(node.name))
  const propertyTax = emergency.children.filter(node => /property tax/i.test(node.name))
  emergency.children = emergency.children.filter(node => !insurance.includes(node) && !propertyTax.includes(node))

  const growth = roots.get('growth')
  const emergencyRD = growth.children.filter(node => /^(recurring deposit|emergency rd)$/i.test(node.name.trim()))
  growth.children = growth.children.filter(node => !emergencyRD.includes(node))

  const protection = roots.get('protection')
  const tax = roots.get('tax')
  const addUnique = (target, additions) => {
    target.children = [...target.children, ...additions.filter(node => !target.children.some(existing => existing.id === node.id))]
  }
  addUnique(emergency, emergencyRD)
  addUnique(protection, insurance)
  addUnique(tax, propertyTax)

  const order = FLOW_GROUPS.map(group => group.id)
  return [...order.map(id => roots.get(id)), ...tree.filter(node => !order.includes(node.id))]
}

export function findNode(nodes, id) {
  for (const node of nodes) {
    if (node.id === id) return node
    const child = findNode(node.children || [], id)
    if (child) return child
  }
  return null
}

export function pathToNode(nodes, id) {
  for (const node of nodes) {
    if (node.id === id) return [id]
    const childPath = pathToNode(node.children || [], id)
    if (childPath.length) return [node.id, ...childPath]
  }
  return []
}

export function removeNode(nodes, id) {
  return nodes.filter(node => node.id !== id).map(node => ({
    ...node, children: removeNode(node.children || [], id),
  }))
}

export function countBranch(node) {
  return 1 + (node.children || []).reduce((count, child) => count + countBranch(child), 0)
}

/** The path is an array of IDs from a top-level group to the current node. */
export function findPath(nodes, path) {
  let siblings = nodes
  let current = null
  for (const id of path) {
    current = siblings.find(node => node.id === id)
    if (!current) return null
    siblings = current.children || []
  }
  return current
}

export function updateNode(nodes, id, changes) {
  return nodes.map(node => ({
    ...node,
    ...(node.id === id ? changes : {}),
    children: updateNode(node.children || [], id, changes),
  }))
}

export function addChild(nodes, parentId, child) {
  if (parentId === null) return [...nodes, child]
  return nodes.map(node => ({
    ...node,
    children: node.id === parentId
      ? [...(node.children || []), child]
      : addChild(node.children || [], parentId, child),
  }))
}
