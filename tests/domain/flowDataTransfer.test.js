import test from 'node:test'
import assert from 'node:assert/strict'
import { createFlowExport, parseFlowImport, serializeFlowData, summarizeFlowData } from '../../src/domain/flowDataTransfer.js'

const plan = {
  profile: { name: 'You', visible: true },
  incomeSources: [{ id: 'salary', name: 'Salary', amount: 60000, icon: 'payments', startDate: '2026-09-23', dayOfMonth: 1 }],
  generalLedgers: [{ id: 'home-gl', name: 'Home GL', note: '', symbol: 'home', budget: 5000, entries: [{ id: 'groceries', date: '2026-09-20', description: 'Groceries', amount: 1250 }] }],
  buffer: 5000,
  tree: [{
    id: 'needs', name: 'Cash Flow', amount: 0, savedAmount: 0, startDate: '', dueDate: '', dayOfMonth: 1, period: 'month', status: 'active', icon: 'wallet', symbol: '', tone: 'blue', note: '',
    children: [{ id: 'tax', name: 'Property tax', amount: 12000, savedAmount: 3000, startDate: '2026-09-20', dueDate: '2027-09-20', dayOfMonth: 1, period: 'year', status: 'active', icon: 'receipt_long', symbol: '', tone: 'blue', note: '', children: [] }],
  }],
}

test('Flowtree JSON export round-trips the supported plan fields', () => {
  const exportedAt = new Date('2026-09-20T10:00:00.000Z')
  const payload = createFlowExport(plan, exportedAt)
  assert.equal(payload.format, 'flowtree-plan')
  assert.equal(payload.version, 1)
  assert.equal(payload.exportedAt, exportedAt.toISOString())
  assert.deepEqual(parseFlowImport(serializeFlowData(plan, exportedAt)), plan)
  assert.deepEqual(JSON.parse(serializeFlowData(plan, exportedAt)), plan)
  assert.deepEqual(summarizeFlowData(plan), { destinations: 2, yearlyTargets: 1, incomeSources: 1 })
})

test('pinned camera views survive raw JSON and backup exports with legacy compatibility', () => {
  const pinned = { ...plan, canvasPins: {
    home: { zoom: 0.8, scrollLeft: 400, scrollTop: 250, path: [], collapsedPaths: ['needs'] },
    sinking: { zoom: 1.2, scrollLeft: 150.5, scrollTop: 90, path: ['needs'], collapsedPaths: [] },
    lastView: 'sinking',
  } }
  assert.deepEqual(parseFlowImport(serializeFlowData(pinned)), pinned)
  assert.deepEqual(parseFlowImport(JSON.stringify(createFlowExport(pinned))), pinned)
  assert.equal(parseFlowImport(serializeFlowData(plan)).canvasPins, undefined)
  assert.throws(() => parseFlowImport(JSON.stringify({ ...pinned, canvasPins: { home: { ...pinned.canvasPins.home, scrollTop: -1 } } })), /canvasPins/)
})

test('manual raw JSON plans are accepted and normalized', () => {
  const imported = parseFlowImport(JSON.stringify({
    profile: { name: 'Me' },
    incomeSources: [],
    buffer: 0,
    tree: [{ id: 'goal', name: 'Goal', amount: 100, children: [] }],
  }))
  assert.deepEqual(imported.profile, { name: 'Me', visible: true })
  assert.deepEqual(imported.generalLedgers, [])
  assert.equal(imported.tree[0].period, 'month')
  assert.equal(imported.tree[0].status, 'active')
  assert.equal(imported.tree[0].dayOfMonth, 1)
})

test('general ledger budgets preserve valid amounts and safely migrate older plans', () => {
  const legacy = { ...plan, generalLedgers: [{ ...plan.generalLedgers[0], budget: undefined }] }
  assert.equal(parseFlowImport(JSON.stringify(legacy)).generalLedgers[0].budget, 0)
  assert.throws(() => parseFlowImport(JSON.stringify({ ...plan, generalLedgers: [{ ...plan.generalLedgers[0], budget: -1 }] })), /budget must be a non-negative number/)
  assert.throws(() => parseFlowImport(JSON.stringify({ ...plan, generalLedgers: [{ ...plan.generalLedgers[0], budget: '5000' }] })), /budget must be a non-negative number/)
})

test('invalid and ambiguous imports are rejected before replacement', () => {
  assert.throws(() => parseFlowImport('{bad json'), /not valid JSON/)
  assert.throws(() => parseFlowImport(JSON.stringify({ ...plan, buffer: -1 })), /buffer must be a non-negative number/)
  assert.throws(() => parseFlowImport(JSON.stringify({ ...plan, tree: [plan.tree[0], plan.tree[0]] })), /Duplicate destination id/)
  assert.throws(() => parseFlowImport(JSON.stringify({ format: 'another-app', version: 1, data: plan })), /not a Flowtree plan/)
  assert.throws(() => parseFlowImport(JSON.stringify({ format: 'flowtree-plan', version: 2, data: plan })), /version 2 is not supported/)
  assert.throws(() => parseFlowImport(JSON.stringify({ ...plan, generalLedgers: [{ ...plan.generalLedgers[0], entries: [{ id: 'same', date: '2026-09-20', description: 'One', amount: 1 }, { id: 'same', date: '2026-09-21', description: 'Two', amount: 1 }] }] })), /Duplicate ledger entry id/)
})

test('investment metadata round-trips and rejects negative recorded values', () => {
  const investmentPlan = {
    ...plan,
    tree: [{ id: 'growth', name: 'Long-Term Growth', amount: 0, children: [{ id: 'index-fund', name: 'Index fund', amount: 5000, investment: { type: 'Mutual fund', currentValue: 125000 }, children: [] }] }],
  }
  const imported = parseFlowImport(serializeFlowData(investmentPlan))
  assert.deepEqual(imported.tree[0].children[0].investment, { type: 'Mutual fund', currentValue: 125000 })
  assert.throws(() => parseFlowImport(JSON.stringify({ ...investmentPlan, tree: [{ ...investmentPlan.tree[0], children: [{ ...investmentPlan.tree[0].children[0], investment: { type: 'Mutual fund', currentValue: -1 } }] }] })), /investment.currentValue must be a non-negative number/)
})

test('loan balances can retain an overpayment credit', () => {
  const loanPlan = {
    ...plan,
    tree: [{ id: 'debt', name: 'Debt', amount: 0, loan: { principal: 100000, remainingPrincipal: -250, annualRate: 8, tenureMonths: 120, extraPayment: 0 }, children: [] }],
  }
  assert.equal(parseFlowImport(serializeFlowData(loanPlan)).tree[0].loan.remainingPrincipal, -250)
})

test('loan plans preserve a user monthly contribution', () => {
  const loanPlan = {
    ...plan,
    tree: [{ id: 'debt', name: 'Debt', amount: 4000, loan: { principal: 1200000, remainingPrincipal: 1200000, annualRate: 0, tenureMonths: 120, extraPayment: 0, userMonthlyContribution: 4000 }, children: [] }],
  }
  assert.equal(parseFlowImport(serializeFlowData(loanPlan)).tree[0].loan.userMonthlyContribution, 4000)
})
