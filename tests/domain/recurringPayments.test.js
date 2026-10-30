import test from 'node:test'
import assert from 'node:assert/strict'
import { recurringPaymentSummary } from '../../src/domain/recurringPayments.js'

test('calendar groups direct monthly payments without counting child totals twice', () => {
  const tree = [{ id: 'home', name: 'Home', period: 'month', amount: 100, status: 'active', children: [
    { id: 'rent', name: 'Rent', period: 'month', amount: 200, status: 'active', dayOfMonth: 5 },
    { id: 'tax', name: 'Tax', period: 'year', amount: 1200, status: 'active' },
    { id: 'paused', name: 'Paused', period: 'month', amount: 500, status: 'dormant' },
  ] }]
  const original = structuredClone(tree)
  const summary = recurringPaymentSummary(tree)
  assert.equal(summary.monthlyTotal, 300)
  assert.deepEqual(summary.payments.map(item => item.id), ['home', 'rent'])
  assert.equal(summary.paymentsByDay[5][0].category, 'Home')
  assert.deepEqual(tree, original)
})
