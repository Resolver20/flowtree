import test from 'node:test'
import assert from 'node:assert/strict'
import { selectSinkingFunds, sinkingFundsOverview } from '../../src/domain/sinkingFunds.js'
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
  assert.deepEqual(sinkingFundsOverview(sinking, today), { monthly: 2500, plannedSaved: 0, hasTargets: true })
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
