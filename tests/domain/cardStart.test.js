import test from 'node:test'
import assert from 'node:assert/strict'
import { cardStartDate, cardStartMode } from '../../src/domain/cardStart.js'
import { monthlyAllocation } from '../../src/domain/flowTree.js'
import { goalSavingsPlan } from '../../src/domain/goalSavingsPlan.js'
import { loanProjection } from '../../src/domain/loan.js'

const today = new Date(2026, 9, 31)
test('dated-target editors can start fresh today or retain an existing start date', () => {
  assert.equal(cardStartDate(today), '2026-10-31')
  assert.equal(cardStartMode('', '2026-10-31'), 'fresh')
  assert.equal(cardStartMode('2026-10-31', '2026-10-31'), 'fresh')
  assert.equal(cardStartMode('2026-01-01', '2026-10-31'), 'existing')
})

test('fresh and existing schedules work outside Life goals', () => {
  const insurance = { amount: 12000, period: 'year', dueDate: '2027-03-31', savedAmount: 0, status: 'active' }
  assert.equal(monthlyAllocation({ ...insurance, startDate: cardStartDate(today) }, today), 2000)
  const tax = { ...insurance, startDate: '2026-01-01', dueDate: '2026-12-31' }
  assert.equal(goalSavingsPlan(tax, today).saved, 9000)
  assert.equal(monthlyAllocation(tax, today), 1000)
})

test('monthly bills, investments, and lender projections retain their calculations', () => {
  for (const startDate of ['2026-10-31', '2026-01-01']) {
    assert.equal(monthlyAllocation({ amount: 1500, period: 'month', status: 'active', startDate }, today), 1500)
    const loan = { principal: 100000, remainingPrincipal: 80000, annualRate: 8, tenureMonths: 24 }
    assert.deepEqual(loanProjection({ ...loan, startDate }), loanProjection(loan))
  }
})
