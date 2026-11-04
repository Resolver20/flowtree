import test from 'node:test'
import assert from 'node:assert/strict'
import { selectSinkingFunds, sinkingFundsOverview } from '../../src/domain/sinkingFunds.js'
import { monthlyDeductionBreakdown } from '../../src/domain/monthlyDeductions.js'
import { createExamplePlan } from '../../src/domain/examplePlan.js'
import { sortTreeByMonthlyTotal, monthlyTotal } from '../../src/domain/flowTree.js'

const tree = [{ id: 'needs', amount: 0, children: [
  { id: 'monthly-bill', amount: 1000, period: 'month', children: [] },
  { id: 'subscriptions', amount: 0, period: 'month', children: [
    { id: 'monthly-service', amount: 195, period: 'month', children: [] },
    { id: 'annual-service', amount: 120, savedAmount: 0, period: 'year', children: [] },
  ] },
  { id: 'recharge', amount: 1200, savedAmount: 0, period: 'year', children: [] },
] }]

test('sinking children retain the same relative order as Home after filtering', () => {
  const home = sortTreeByMonthlyTotal(tree)
  assert.deepEqual(home[0].children.map(node => node.id), ['monthly-bill', 'subscriptions', 'recharge'])
  const sinking = selectSinkingFunds(home)
  assert.deepEqual(sinking[0].children.map(node => node.id), ['subscriptions', 'recharge'])
  assert.deepEqual(sinking[0].children[0].children.map(node => node.id), ['annual-service'])
})

test('dated cards retain monthly and nested descendants with identical record data', () => {
  const child = { id: 'child', amount: 100, period: 'month', status: 'inactive', note: 'Keep me', children: [{ id: 'nested', amount: 50, period: 'month', children: [] }] }
  const dated = { id: 'insurance', amount: 12000, savedAmount: 3000, startDate: '2026-01-01', dueDate: '2026-12-31', period: 'year', status: 'active', children: [child] }
  const original = structuredClone(dated)
  const [selected] = selectSinkingFunds([dated])
  assert.deepEqual(selected, original)
  assert.equal(monthlyTotal(selected), monthlyTotal(dated))
  assert.deepEqual(dated, original)
  assert.notEqual(selected.children, dated.children)
})

test('nested ancestors stay connected and empty or unrelated branches are excluded', () => {
  assert.deepEqual(selectSinkingFunds([]), [])
  assert.deepEqual(selectSinkingFunds([{ id: 'monthly', period: 'month', children: [] }]), [])
  const result = selectSinkingFunds([{ id: 'root', children: [{ id: 'group', children: [{ id: 'target', period: 'year', children: [] }] }] }])
  assert.equal(result[0].children[0].children[0].id, 'target')
})

test('beginner sinking overview leads with monthly saving and keeps fresh progress at zero', () => {
  const today = new Date(2026, 9, 31)
  const plan = createExamplePlan(today)
  const sinking = selectSinkingFunds(plan.tree)
  assert.deepEqual(sinkingFundsOverview(sinking, today), { monthly: 8500, plannedSaved: 0, hasTargets: true })
  assert.deepEqual(sinkingFundsOverview([], today), { monthly: 0, plannedSaved: 0, hasTargets: false })
})

test('sinking overview respects nested amounts and pauses without double counting parent totals', () => {
  const today = new Date(2026, 9, 31)
  const target = { id: 'annual', amount: 12000, period: 'year', startDate: '2026-01-01', dueDate: '2026-12-31', children: [
    { id: 'monthly', amount: 100, period: 'month', children: [] },
    { id: 'annual-child', amount: 2400, period: 'year', startDate: '2026-10-01', dueDate: '2027-09-30', children: [] },
  ] }
  const original = structuredClone(target)
  assert.deepEqual(sinkingFundsOverview([target], today), { monthly: 1300, plannedSaved: 9000, hasTargets: true })
  assert.deepEqual(target, original)
  assert.deepEqual(sinkingFundsOverview([{ ...target, status: 'inactive' }], today), { monthly: 0, plannedSaved: 0, hasTargets: true })
})

test('planned savings excludes paused branches and legacy inactive statuses, and restores them on activation', () => {
  const today = new Date(2026, 9, 31)
  const active = { id: 'active', period: 'year', amount: 12000, savedAmount: 3000, children: [] }
  const child = { ...active, id: 'child', savedAmount: 1500 }
  for (const status of ['inactive', 'dormant', 'funded']) {
    const paused = { ...active, id: 'paused', status, children: [child] }
    const nodes = [active, paused]
    const original = structuredClone(nodes)
    assert.equal(sinkingFundsOverview(nodes, today).plannedSaved, 3000)
    assert.equal(sinkingFundsOverview([{ id: 'group', status, children: [active] }], today).plannedSaved, 0)
    assert.equal(sinkingFundsOverview([active, { ...paused, status: 'active' }], today).plannedSaved, 7500)
    assert.deepEqual(nodes, original)
  }
})


test('explicit expense choices override frequency and exclude unrelated parent amounts', () => {
  const original = [{ id: 'cash', amount: 900, period: 'month', expenseType: 'current', children: [
    { id: 'service', amount: 500, period: 'month', expenseType: 'upcoming', children: [] },
    { id: 'annual-current', amount: 12000, period: 'year', expenseType: 'current', children: [] },
  ] }]
  const snapshot = structuredClone(original)
  const result = selectSinkingFunds(original)
  assert.equal(result[0].amount, 0)
  assert.deepEqual(result[0].children.map(node => node.id), ['service'])
  assert.equal(sinkingFundsOverview(result).monthly, 500)
  assert.equal(sinkingFundsOverview(result).hasTargets, true)
  assert.deepEqual(original, snapshot)
})

test('explicit current children stay out while planned goals and growth remain visible', () => {
  const result = selectSinkingFunds([
    { id: 'service', expenseType: 'upcoming', children: [{ id: 'fuel', expenseType: 'current', children: [] }] },
    { id: 'goals', children: [{ id: 'car', period: 'year', children: [] }] },
    { id: 'growth', children: [{ id: 'invest', period: 'year', children: [] }] },
  ])
  assert.deepEqual(result.map(node => node.id), ['service', 'goals', 'growth'])
  assert.deepEqual(result[0].children, [])
})


test('planned totals reconcile across all categories, including renamed built-in categories', () => {
  const today = new Date(2026, 10, 4)
  const tree = [
    { id: 'growth', name: 'Maintenance', amount: 0, expenseType: 'current', children: [
      { id: 'car', name: 'Car Servicing', amount: 12000, period: 'year', startDate: '2026-11-02', dueDate: '2027-10-02', expenseType: 'upcoming', children: [] },
      { id: 'bike', name: 'Bike Servicing', amount: 12000, period: 'year', startDate: '2026-11-02', dueDate: '2027-10-02', expenseType: 'upcoming', children: [] },
    ] },
    { id: 'needs', amount: 100, expenseType: 'current', children: [{ id: 'current', amount: 400, expenseType: 'current' }, { id: 'monthly-plan', amount: 500, expenseType: 'upcoming' }] },
    { id: 'obligations', amount: 0, children: [{ id: 'planned-loan', amount: 200, expenseType: 'upcoming', loan: {} }] },
    { id: 'goals', children: [{ id: 'goal', amount: 300, expenseType: 'upcoming' }] },
    { id: 'provisions', amount: 400, expenseType: 'upcoming' },
    { id: 'paused', status: 'inactive', expenseType: 'upcoming', amount: 999, children: [{ id: 'paused-child', amount: 999, expenseType: 'upcoming' }] },
  ]
  const original = structuredClone(tree)
  const selected = selectSinkingFunds(tree)
  assert.equal(sinkingFundsOverview(selected, today).monthly, 3400)
  assert.equal(sinkingFundsOverview(selected, today).monthly, monthlyDeductionBreakdown(tree, today).upcoming)
  assert.deepEqual(selected.find(node => node.id === 'growth').children.map(node => node.id), ['car', 'bike'])
  assert.equal(selected.find(node => node.id === 'needs').amount, 0)
  assert.deepEqual(selected.find(node => node.id === 'needs').children.map(node => node.id), ['monthly-plan'])
  assert.deepEqual(tree, original)
})
