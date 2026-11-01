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

test('target-year schedules backdate one year and use exactly twelve monthly contributions', async () => {
  const { yearBeforeTarget } = await import('../../src/domain/cardStart.js')
  assert.equal(yearBeforeTarget('2027-05-15'), '2026-05-15')
  assert.equal(yearBeforeTarget('2028-02-29'), '2027-02-28')
  assert.equal(yearBeforeTarget(''), '')
  assert.equal(yearBeforeTarget('2027-02-30'), '')
  const node = { amount: 12000, startMode: 'target-year', startDate: '2026-05-15', dueDate: '2027-05-15', period: 'year', savedAmount: 0 }
  const plan = goalSavingsPlan(node, new Date(2026, 10, 1))
  assert.equal(plan.totalMonths, 12)
  assert.equal(plan.saved, 6000)
  assert.equal(plan.monthlyRequired, 1000)
  assert.equal(goalSavingsPlan(node, new Date(2026, 3, 1)).saved, 0)
  assert.equal(goalSavingsPlan(node, new Date(2027, 4, 15)).saved, 12000)
  assert.equal(goalSavingsPlan({ ...node, dueDate: '2027-11-15' }, new Date(2026, 10, 1)).saved, 0)
})
