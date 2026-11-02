import test from 'node:test'
import assert from 'node:assert/strict'
import { monthlyDeductionBreakdown } from '../../src/domain/monthlyDeductions.js'
import { totalChildren } from '../../src/domain/flowTree.js'

const today = new Date(2026, 10, 2)
test('current and upcoming deductions count direct amounts once and reconcile with the full plan', () => {
  const tree = [{ id: 'cash', amount: 100, children: [
    { id: 'fuel', amount: 2000, period: 'month', expenseType: 'current' },
    { id: 'service', amount: 500, period: 'month', expenseType: 'upcoming' },
    { id: 'insurance', amount: 12000, period: 'year' },
    { id: 'annual-current', amount: 2400, period: 'year', expenseType: 'current' },
  ] }]
  const before = structuredClone(tree)
  const result = monthlyDeductionBreakdown(tree, today)
  assert.equal(result.current, 2300)
  assert.equal(result.upcoming, 1500)
  assert.equal(result.total, totalChildren(tree, today))
  assert.deepEqual(tree, before)
})
test('future savings, goals, and nested overrides contribute to the right subtotal', () => {
  const tree = [{ id: 'goals', children: [{ amount: 300, period: 'month' }] },
    { id: 'provisions', amount: 400 }, { id: 'growth', children: [{ amount: 500 }] },
    { id: 'parent', expenseType: 'upcoming', amount: 100, children: [{ amount: 200 }, { amount: 50, expenseType: 'current' }] },
    { id: 'loan', amount: 1000, loan: {} }]
  assert.deepEqual(monthlyDeductionBreakdown(tree, today), { current: 1050, upcoming: 1500, total: 2550 })
})
test('inactive parents suppress descendants and zero plans remain zero', () => {
  for (const status of ['inactive', 'dormant', 'funded']) {
    const tree = [{ amount: 500, status, children: [{ amount: 1000, expenseType: 'upcoming' }] }]
    assert.deepEqual(monthlyDeductionBreakdown(tree, today), { current: 0, upcoming: 0, total: 0 })
  }
  assert.deepEqual(monthlyDeductionBreakdown([], today), { current: 0, upcoming: 0, total: 0 })
})

test('changing expense type moves the same monthly amount without changing available money', () => {
  const card = { id: 'service', amount: 500, period: 'month', expenseType: 'upcoming' }
  const before = monthlyDeductionBreakdown([card], today)
  const after = monthlyDeductionBreakdown([{ ...card, expenseType: 'current' }], today)
  assert.deepEqual(before, { current: 0, upcoming: 500, total: 500 })
  assert.deepEqual(after, { current: 500, upcoming: 0, total: 500 })
  assert.equal(400 - 100 - before.total, -200)
  assert.equal(before.total, after.total)
})
