import test from 'node:test'
import assert from 'node:assert/strict'
import { requiredMonthlyAmount, monthlyAllocation, monthlyTotal } from '../../src/domain/flowTree.js'

const today = new Date(2026, 9, 31)
const goal = { amount: 2000000, savedAmount: 0, startDate: '2026-11-01', dueDate: '2028-10-31', period: 'year', status: 'inactive', children: [] }

test('an inactive twenty-lakh goal still shows its required monthly savings', () => {
  assert.equal(requiredMonthlyAmount(goal, today), 2000000 / 24)
  assert.equal(monthlyAllocation(goal, today), 0)
  assert.equal(monthlyTotal(goal, today), 0)
  assert.equal(requiredMonthlyAmount({ ...goal, status: 'active' }, today), requiredMonthlyAmount(goal, today))
  assert.equal(monthlyAllocation({ ...goal, status: 'active' }, today), requiredMonthlyAmount(goal, today))
})

test('required monthly savings respond to saved amounts, targets, and deadlines while paused', () => {
  assert.equal(requiredMonthlyAmount({ ...goal, savedAmount: 400000 }, today), 1600000 / 24)
  assert.equal(requiredMonthlyAmount({ ...goal, dueDate: '2027-10-31' }, today), 2000000 / 12)
  assert.equal(requiredMonthlyAmount({ ...goal, amount: 2400000 }, today), 100000)
  assert.equal(requiredMonthlyAmount({ ...goal, savedAmount: 2000000 }, today), 0)
  assert.equal(requiredMonthlyAmount({ ...goal, period: 'month', amount: 5000 }, today), 5000)
})
