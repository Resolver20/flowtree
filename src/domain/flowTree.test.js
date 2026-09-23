import test from 'node:test'
import assert from 'node:assert/strict'
import {
  addChild,
  createTreeFromBuckets,
  findPath,
  migrateFinancialCategories,
  monthlyTotal,
  totalChildren,
  updateNode,
  removeNode,
  pathToNode,
  countBranch,
  annualTargetProgress,
  monthlyAllocation,
  monthsUntilTarget,
  expectedAnnualSavings,
  totalExpectedAnnualSavings,
  sortTreeByMonthlyTotal,
} from './flowTree.js'

test('CRUD supports nested creation, editing, branch deletion and immutable undo', () => {
  const original = createTreeFromBuckets()
  const child = { id: 'custom', name: 'Travel', amount: 1200, period: 'year', status: 'active', children: [] }
  const created = addChild(original, 'needs', child)
  assert.deepEqual(pathToNode(created, 'custom'), ['needs', 'custom'])
  const edited = updateNode(created, 'custom', { name: 'Holiday', amount: 2400, symbol: 'flight' })
  assert.equal(monthlyTotal(findPath(edited, ['needs', 'custom'])), 200)
  assert.equal(findPath(created, ['needs', 'custom']).name, 'Travel')
  const deleted = removeNode(edited, 'needs')
  assert.deepEqual(pathToNode(deleted, 'custom'), [])
  assert.equal(deleted.length, original.length - 1)
  assert.ok(countBranch(findPath(edited, ['needs'])) > 1)
  assert.equal(findPath(edited, ['needs', 'custom']).name, 'Holiday')
  assert.deepEqual(removeNode([], 'missing'), [])
})

test('empty plans accept top-level categories and deleted leaves no longer count', () => {
  const tree = addChild([], null, { id: 'one', amount: 75, children: [] })
  assert.equal(totalChildren(tree), 75)
  assert.deepEqual(pathToNode(tree, 'missing'), [])
})

test('yearly targets keep saved progress separate from monthly planning', () => {
  const node = { amount: 12000, savedAmount: 3000, period: 'year', status: 'active', children: [] }
  assert.equal(monthlyTotal(node), 750)
  assert.deepEqual(annualTargetProgress(node), { target: 12000, saved: 3000, ratio: 0.25 })
  assert.deepEqual(annualTargetProgress({ ...node, savedAmount: 20000 }), { target: 12000, saved: 12000, ratio: 1 })
  assert.equal(annualTargetProgress({ ...node, period: 'month' }), null)
})

test('yearly target deadlines spread only the remaining balance across future months', () => {
  const today = new Date(2026, 8, 20)
  const node = { amount: 12000, savedAmount: 3000, dueDate: '2027-03-15', period: 'year', status: 'active', children: [] }
  assert.equal(monthsUntilTarget(node.dueDate, today), 6)
  assert.equal(expectedAnnualSavings(node, today), 6000)
  assert.equal(monthlyAllocation(node, today), 1000)
  assert.equal(monthlyTotal(node, today), 1000)
  assert.equal(monthlyAllocation({ ...node, savedAmount: 12000, dueDate: '' }, today), 0)
  assert.equal(monthlyAllocation({ ...node, dueDate: '' }, today), 750)
  assert.equal(monthsUntilTarget('2026-09-30', today), 1)
})

test('expected yearly savings totals annual targets across the full tree', () => {
  const today = new Date(2026, 8, 20)
  const nodes = [
    { amount: 500, period: 'month', children: [] },
    { amount: 12000, savedAmount: 0, dueDate: '2027-03-15', period: 'year', children: [
      { amount: 6000, savedAmount: 1500, dueDate: '', period: 'year', children: [] },
    ] },
  ]
  assert.equal(totalExpectedAnnualSavings(nodes, today), 7500)
})

test('every sibling level sorts by monthly total without mutating stored order', () => {
  const nodes = [
    { id: 'small', amount: 100, period: 'month', status: 'active', children: [{ id: 'child-a', amount: 50, period: 'month', status: 'active', children: [] }] },
    { id: 'large', amount: 500, period: 'month', status: 'active', children: [] },
    { id: 'middle', amount: 200, period: 'month', status: 'active', children: [
      { id: 'child-small', amount: 25, period: 'month', status: 'active', children: [] },
      { id: 'child-large', amount: 100, period: 'month', status: 'active', children: [] },
    ] },
  ]
  const ordered = sortTreeByMonthlyTotal(nodes)
  assert.deepEqual(ordered.map(node => node.id), ['large', 'middle', 'small'])
  assert.deepEqual(ordered[1].children.map(node => node.id), ['child-large', 'child-small'])
  assert.deepEqual(nodes.map(node => node.id), ['small', 'large', 'middle'])
  assert.deepEqual(nodes[2].children.map(node => node.id), ['child-small', 'child-large'])
})

test('subscriptions form a second level and parent totals count each service once', () => {
  const tree = createTreeFromBuckets()
  const needs = findPath(tree, ['needs'])
  const subscriptions = findPath(tree, ['needs', 'subscriptions'])

  assert.deepEqual(subscriptions.children.map(node => node.name), [
    'Google Drive', 'Apple One', 'GPT', 'Netflix',
  ])
  assert.equal(monthlyTotal(subscriptions), 2550)
  assert.ok(Math.abs(monthlyTotal(needs) - (1000 + 4000 / 12 + 2550)) < 0.001)
  assert.ok(Math.abs(totalChildren(tree) - (1000 + 4000 / 12 + 2550 + 20000 + 19000 / 12 + 11000)) < 0.001)
})

test('a dormant branch contributes nothing until activated', () => {
  const tree = createTreeFromBuckets()
  const dormant = updateNode(tree, 'subscriptions', { status: 'dormant' })
  assert.equal(monthlyTotal(findPath(dormant, ['needs', 'subscriptions'])), 0)
  assert.equal(monthlyTotal(findPath(dormant, ['needs'])), 1000 + 4000 / 12)
})

test('any node may receive children without losing its own allocation', () => {
  const tree = createTreeFromBuckets()
  const child = { id: 'new', name: 'Extra service', amount: 100, period: 'month', status: 'active', children: [] }
  const nested = addChild(tree, 'seed-4', child)
  assert.equal(monthlyTotal(findPath(nested, ['needs', 'subscriptions', 'seed-4'])), 2100)
  assert.equal(findPath(nested, ['needs', 'subscriptions', 'seed-4', 'new']).name, 'Extra service')
})

test('legacy bucket amounts and statuses survive tree migration', () => {
  const tree = createTreeFromBuckets([
    { id: 'old-gpt', name: 'GPT', amount: 2500, period: 'year', group: 'needs', status: 'active' },
    { id: 'old-goal', name: 'House', amount: 9000, period: 'month', group: 'goals', status: 'dormant' },
  ])
  assert.equal(monthlyTotal(findPath(tree, ['needs', 'subscriptions'])), 2500 / 12)
  assert.equal(monthlyTotal(findPath(tree, ['goals'])), 0)
  assert.equal(findPath(tree, ['goals', 'old-goal']).amount, 9000)
})

test('starter categories follow financial management, risk, tax, and investment areas', () => {
  const tree = migrateFinancialCategories(createTreeFromBuckets([
    { id: 'rd', name: 'Recurring deposit', amount: 1000, period: 'month', group: 'growth', status: 'active' },
    { id: 'tax', name: 'Property tax', amount: 12000, period: 'year', group: 'provisions', status: 'active' },
    { id: 'cover', name: 'Car insurance', amount: 6000, period: 'year', group: 'provisions', status: 'active' },
  ]))
  assert.equal(findPath(tree, ['provisions']).name, 'Emergency Fund')
  assert.equal(findPath(tree, ['protection', 'cover']).name, 'Car insurance')
  assert.equal(findPath(tree, ['tax', 'tax']).name, 'Property tax')
  assert.equal(findPath(tree, ['provisions', 'rd']).name, 'Recurring deposit')
})
