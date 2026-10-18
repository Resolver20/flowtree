import test from 'node:test'
import assert from 'node:assert/strict'
import { loanProjection, monthlyPayment } from './loan.js'

test('monthly payment handles interest-free loans', () => {
  assert.equal(monthlyPayment(120000, 0, 12), 10000)
})

test('extra monthly payments shorten the projected payoff', () => {
  const standard = loanProjection({ principal: 100000, remainingPrincipal: 100000, annualRate: 12, tenureMonths: 24 })
  const accelerated = loanProjection({ principal: 100000, remainingPrincipal: 100000, annualRate: 12, tenureMonths: 24, extraPayment: 2500 })
  assert.equal(standard.payoffMonths, 24)
  assert.ok(accelerated.payoffMonths < standard.payoffMonths)
  assert.ok(accelerated.totalInterest < standard.totalInterest)
})
