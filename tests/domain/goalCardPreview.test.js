import test from 'node:test'
import assert from 'node:assert/strict'
import { goalCardPreview } from '../../src/features/flowtree/goalCardPreview.js'
import { monthlyTotal } from '../../src/domain/flowTree.js'

const today = new Date(2026, 9, 31)
const goal = { amount: 2000000, savedAmount: 0, startDate: '2026-11-01', dueDate: '2028-10-31', period: 'year', status: 'inactive', children: [] }

test('inactive goal cards show the monthly estimate while actual allocation stays zero', () => {
  assert.deepEqual(goalCardPreview(goal, true, 0, today), { monthlyAmount: 2000000 / 24, inactive: true })
  assert.equal(monthlyTotal(goal, today), 0)
  assert.equal(goal.status, 'inactive')
})

test('active goal cards can show their estimate even under a paused parent', () => {
  assert.deepEqual(goalCardPreview({ ...goal, status: 'active' }, true, 0, today), { monthlyAmount: 2000000 / 24, inactive: false })
})

test('non-goal cards retain allocation amounts and legacy inactive statuses get a marker', () => {
  assert.deepEqual(goalCardPreview({ ...goal, status: 'dormant' }, false, 0, today), { monthlyAmount: 0, inactive: true })
  assert.deepEqual(goalCardPreview({ ...goal, status: 'active' }, false, 100, today), { monthlyAmount: 100, inactive: false })
})
