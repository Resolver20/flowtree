import test from 'node:test'
import assert from 'node:assert/strict'
import { ledgerOverview, ledgerRemaining } from '../../src/domain/generalLedger.js'
import { shouldShowLedgerOverview } from '../../src/features/flowtree/ledgerOverview.js'

test('ledger overview sums each budget and expense once without mutating records', () => {
  const ledgers = [
    { id: 'home', budget: 25000, entries: [{ amount: 1200.5 }, { amount: 300 }] },
    { id: 'travel', budget: 10000, entries: [{ amount: 15000 }] },
  ]
  const before = structuredClone(ledgers)
  assert.deepEqual(ledgerOverview(ledgers), { budget: 35000, expenses: 16500.5, remaining: 18499.5, expenseCount: 3 })
  assert.equal(ledgerRemaining(ledgers[1]), -5000)
  assert.deepEqual(ledgers, before)
})

test('overview keeps overspending signed and supports empty or legacy ledgers', () => {
  assert.deepEqual(ledgerOverview([]), { budget: 0, expenses: 0, remaining: 0, expenseCount: 0 })
  assert.deepEqual(ledgerOverview([{ entries: [{ amount: 200 }] }, { budget: 100 }]), { budget: 100, expenses: 200, remaining: -100, expenseCount: 1 })
  assert.equal(ledgerOverview([{ budget: 12500000, entries: [{ amount: 1 }] }]).remaining, 12499999)
})

test('outside ledger cards return to overview while editors and controls retain their work', () => {
  const target = { closest: () => null }
  const state = { selected: { id: 'home' }, editingId: null, creating: false }
  assert.equal(shouldShowLedgerOverview(target, state), true)
  for (const overrides of [{ selected: null }, { editingId: 'home' }, { creating: true }]) {
    assert.equal(shouldShowLedgerOverview(target, { ...state, ...overrides }), false)
  }
  for (const selector of ['.ledger-details', '.ledger-editor', 'button', 'input', 'select', 'textarea', 'a']) {
    assert.equal(shouldShowLedgerOverview({ closest: selectors => selectors.split(', ').includes(selector) }, state), false)
  }
})
