import test from 'node:test'
import assert from 'node:assert/strict'
import { goalSavingsPlan } from '../../src/domain/goalSavingsPlan.js'
import { requiredMonthlyAmount, monthlyAllocation, annualTargetProgress } from '../../src/domain/flowTree.js'
import { serializeFlowData, parseFlowImport } from '../../src/domain/flowDataTransfer.js'
const today = new Date(2026, 9, 31)
const fresh = { id: 'goal', name: 'Goal', amount: 120000, savedAmount: 0, startDate: '2026-10-31', dueDate: '2027-03-31', period: 'year', status: 'active', children: [] }

test('fresh goals include this month and show no invented historical savings', () => {
  const plan = goalSavingsPlan(fresh, today)
  assert.equal(plan.saved, 0)
  assert.equal(plan.remaining, 120000)
  assert.equal(plan.monthsRemaining, 6)
  assert.equal(plan.monthlyRequired, 20000)
  assert.equal(monthlyAllocation(fresh, today), 20000)
  assert.equal(goalSavingsPlan({ ...fresh, startDate: '' }, today).monthlyRequired, 20000)
})

test('existing goals split planned savings, remaining amount, and current contribution', () => {
  const goal = { ...fresh, startDate: '2026-01-01', dueDate: '2026-12-31' }
  const plan = goalSavingsPlan(goal, today)
  assert.equal(plan.saved, 90000)
  assert.equal(plan.remaining, 30000)
  assert.equal(plan.monthsRemaining, 3)
  assert.equal(plan.monthlyRequired, 10000)
  assert.deepEqual(annualTargetProgress(goal, today), { target: 120000, saved: 90000, ratio: 0.75 })
  assert.equal(goalSavingsPlan({ ...goal, savedAmount: 100000 }, today).monthlyRequired, 20000 / 3)
  assert.equal(goalSavingsPlan({ ...goal, status: 'inactive' }, today).monthlyRequired, 10000)
  assert.equal(monthlyAllocation({ ...goal, status: 'inactive' }, today), 0)
})

test('current-month deadlines, completion, future starts, and changed end dates stay finite', () => {
  assert.equal(goalSavingsPlan({ ...fresh, dueDate: '2026-10-31' }, today).monthlyRequired, 120000)
  assert.equal(goalSavingsPlan({ ...fresh, savedAmount: 120000 }, today).monthlyRequired, 0)
  assert.equal(goalSavingsPlan({ ...fresh, startDate: '2025-01-01', dueDate: '2025-12-31' }, today).remaining, 0)
  const future = goalSavingsPlan({ ...fresh, startDate: '2026-11-01', dueDate: '2027-10-31' }, today)
  assert.equal(future.saved, 0)
  assert.equal(future.monthlyRequired, 10000)
  assert.equal(requiredMonthlyAmount({ ...fresh, dueDate: '2027-09-30' }, today), 10000)
})

test('fresh start date is persisted so reloading later accrues planned progress', () => {
  const data = { profile: { name: 'Test', visible: true }, incomeSources: [], buffer: 0, tree: [fresh] }
  const restored = parseFlowImport(serializeFlowData(data)).tree[0]
  const nextMonth = goalSavingsPlan(restored, new Date(2026, 10, 1))
  assert.equal(restored.startDate, '2026-10-31')
  assert.equal(nextMonth.saved, 20000)
  assert.equal(nextMonth.monthlyRequired, 20000)
})
