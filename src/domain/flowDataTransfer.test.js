import test from 'node:test'
import assert from 'node:assert/strict'
import { createFlowExport, parseFlowImport, serializeFlowData, summarizeFlowData } from './flowDataTransfer.js'

const plan = {
  profile: { name: 'You', visible: true },
  incomeSources: [{ id: 'salary', name: 'Salary', amount: 60000, icon: 'payments', startDate: '2026-09-23', dayOfMonth: 1 }],
  generalLedgers: [{ id: 'home-gl', name: 'Home GL', note: '', symbol: 'home', entries: [{ id: 'groceries', date: '2026-09-20', description: 'Groceries', amount: 1250 }] }],
  buffer: 5000,
  tree: [{
    id: 'needs', name: 'Cash Flow', amount: 0, savedAmount: 0, startDate: '', dueDate: '', period: 'month', status: 'active', icon: 'wallet', symbol: '', tone: 'blue', note: '',
    children: [{ id: 'tax', name: 'Property tax', amount: 12000, savedAmount: 3000, startDate: '2026-09-20', dueDate: '2027-09-20', period: 'year', status: 'active', icon: 'receipt_long', symbol: '', tone: 'blue', note: '', children: [] }],
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
