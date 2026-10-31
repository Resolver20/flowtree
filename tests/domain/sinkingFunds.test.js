import test from 'node:test'
import assert from 'node:assert/strict'
import { selectSinkingFunds } from '../../src/domain/sinkingFunds.js'
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
