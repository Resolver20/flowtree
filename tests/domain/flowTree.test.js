import test from 'node:test'
import assert from 'node:assert/strict'
import {
  addChild,
  createTreeFromBuckets,
  organizeSubscriptions,
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
} from '../../src/domain/flowTree.js'

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

test('deleting a recurring payment preserves its parent category and every other category', () => {
  const tree = createTreeFromBuckets()
  const deleted = removeNode(tree, 'seed-11')
  assert.equal(deleted.length, tree.length)
  assert.equal(findPath(deleted, ['provisions']).name, 'Emergency Fund')
  assert.equal(findPath(deleted, ['provisions', 'seed-11']), null)
  assert.equal(findPath(deleted, ['needs']).name, 'Cash Flow')
})

test('deleting a loan preserves Debt Commitments and unrelated plan data', () => {
  const tree = addChild(createTreeFromBuckets([]), 'obligations', { id: 'home-loan', name: 'House loan', amount: 10000, period: 'month', status: 'active', loan: { principal: 1200000, remainingPrincipal: 1200000, annualRate: 8, tenureMonths: 240, extraPayment: 0 }, children: [] })
  const deleted = removeNode(tree, 'home-loan')
  assert.equal(findPath(deleted, ['obligations']).name, 'Debt Commitments')
  assert.equal(findPath(deleted, ['obligations', 'home-loan']), null)
  assert.equal(findPath(deleted, ['needs']).name, 'Cash Flow')
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

test('yearly progress preserves savings already recorded ahead of schedule', () => {
  const today = new Date(2026, 9, 18)
  const node = { amount: 12000, savedAmount: 3000, dueDate: '2027-09-20', period: 'year', status: 'active', children: [] }

  assert.deepEqual(annualTargetProgress(node, today), { target: 12000, saved: 3000, ratio: 0.25 })
})

test('dated life goals pace progress across their whole start-to-end window', () => {
  const goal = { amount: 120000, savedAmount: 10000, startDate: '2026-10-01', dueDate: '2028-10-01', period: 'year', status: 'active', children: [] }
  const halfway = new Date(2027, 9, 18)

  assert.deepEqual(annualTargetProgress(goal, halfway), { target: 120000, saved: 60000, ratio: 0.5 })
  assert.equal(monthlyAllocation(goal, halfway), 5000)
  assert.deepEqual(annualTargetProgress({ ...goal, savedAmount: 80000 }, halfway), { target: 120000, saved: 80000, ratio: 2 / 3 })
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

test('legacy direct services move under Cash Flow subscriptions', () => {
  const tree = createTreeFromBuckets([])
  const migrated = organizeSubscriptions(addChild(addChild(tree, 'needs', { id: 'drive', name: 'Google Drive', amount: 150, period: 'month', status: 'active', children: [] }), 'needs', { id: 'gpt', name: 'GPT', amount: 2000, period: 'month', status: 'active', children: [] }))
  const needs = findPath(migrated, ['needs'])
  const subscriptions = findPath(migrated, ['needs', 'subscriptions'])
  assert.equal(needs.name, 'Cash Flow')
  assert.deepEqual(subscriptions.children.map(node => node.id), ['drive', 'gpt'])
  assert.equal(needs.children.some(node => node.id === 'drive' || node.id === 'gpt'), false)
})

test('the Cash Flow root keeps its name when a legacy plan mislabeled it as subscriptions', () => {
  const tree = createTreeFromBuckets([]).map(node => node.id === 'needs' ? { ...node, name: 'Subscriptions' } : node)
  assert.equal(findPath(organizeSubscriptions(tree), ['needs']).name, 'Cash Flow')
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
