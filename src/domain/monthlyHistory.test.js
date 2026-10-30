import test from 'node:test'
import assert from 'node:assert/strict'
import { createMonthSnapshot, preserveCurrentMonth, recordPayment } from './monthlyHistory.js'
import { parseFlowImport, serializeFlowData } from './flowDataTransfer.js'

const plan = { profile: { name: 'Test' }, incomeSources: [{ id: 'salary', name: 'Salary', amount: 100 }], buffer: 10, tree: [{ id: 'loan', name: 'House loan', amount: 120, period: 'month', status: 'active', dayOfMonth: 31, children: [] }] }

test('snapshot clamps day 31 to February and keeps signed available amount', () => {
  const snapshot = createMonthSnapshot(plan, new Date(2028, 1, 1))
  assert.equal(snapshot.payments[0].scheduledDate, '2028-02-29')
  assert.equal(snapshot.income - snapshot.buffer - snapshot.planned, -30)
})

test('amount edits and deletion cannot alter an existing month; next month uses new values', () => {
  const date = new Date(2026, 9, 30)
  const locked = preserveCurrentMonth(plan, date)
  const changed = { ...locked, tree: [{ ...plan.tree[0], name: 'Renamed', amount: 20 }] }
  assert.equal(preserveCurrentMonth(changed, date).monthlyHistory['2026-10'].payments[0].monthlyAmount, 120)
  assert.equal(createMonthSnapshot(changed, new Date(2026, 10, 1)).payments[0].monthlyAmount, 20)
  const deleted = { ...changed, tree: [] }
  assert.equal(deleted.monthlyHistory['2026-10'].payments[0].name, 'House loan')
  assert.equal(plan.monthlyHistory, undefined)
})

test('paid dates and amounts survive JSON save and restore; invalid dates and repeats are rejected', () => {
  const now = new Date(2026, 9, 30)
  const paid = recordPayment(plan, '2026-10', 'loan', '2026-10-29', now)
  const restored = parseFlowImport(serializeFlowData(paid))
  assert.deepEqual(restored.monthlyHistory, paid.monthlyHistory)
  assert.equal(recordPayment(paid, '2026-10', 'loan', '2026-10-30', now), paid)
  assert.equal(recordPayment(plan, '2026-10', 'loan', '2026-10-31', now), plan)
  assert.equal(recordPayment(plan, '2026-09', 'loan', '2026-09-01', now), plan)
  const invalid = structuredClone(paid)
  invalid.monthlyHistory['2026-10'].payments[0].paidDate = '2026-11-01'
  assert.throws(() => serializeFlowData(invalid), /snapshot month/)
})
