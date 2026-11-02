import test from 'node:test'
import assert from 'node:assert/strict'
import { expenseTypeFor } from '../../src/domain/expenseType.js'

test('all card editors infer the same defaults as the monthly summary', () => {
  for (const id of ['goals', 'growth', 'provisions']) assert.equal(expenseTypeFor({ id }), 'upcoming')
  assert.equal(expenseTypeFor({ investment: {} }), 'upcoming')
  assert.equal(expenseTypeFor({ loan: {} }), 'current')
  assert.equal(expenseTypeFor({ period: 'year' }), 'upcoming')
  assert.equal(expenseTypeFor({ period: 'month' }, 'upcoming'), 'upcoming')
  assert.equal(expenseTypeFor({ period: 'month' }), 'current')
})
test('user choices override goal, loan, investment, and emergency defaults', () => {
  for (const node of [{ id: 'goals' }, { id: 'provisions' }, { investment: {} }, { loan: {} }]) {
    for (const expenseType of ['current', 'upcoming']) assert.equal(expenseTypeFor({ ...node, expenseType }), expenseType)
  }
})
