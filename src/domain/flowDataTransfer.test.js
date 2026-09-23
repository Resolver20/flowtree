import test from 'node:test'
import assert from 'node:assert/strict'
import { createFlowExport, parseFlowImport, serializeFlowData, summarizeFlowData } from './flowDataTransfer.js'

const plan = {
  profile: { name: 'You', visible: true },
  incomeSources: [{ id: 'salary', name: 'Salary', amount: 60000, icon: 'payments', startDate: '2026-09-23', dayOfMonth: 1 }],
  buffer: 5000,
  tree: [{
    id: 'needs', name: 'Cash Flow', amount: 0, savedAmount: 0, dueDate: '', period: 'month', status: 'active', icon: 'wallet', symbol: '', tone: 'blue', note: '',
    children: [{ id: 'tax', name: 'Property tax', amount: 12000, savedAmount: 3000, dueDate: '2027-09-20', period: 'year', status: 'active', icon: 'receipt_long', symbol: '', tone: 'blue', note: '', children: [] }],
  }],
}

test('Flowtree JSON export round-trips the supported plan fields', () => {
  const exportedAt = new Date('2026-09-20T10:00:00.000Z')
  const payload = createFlowExport(plan, exportedAt)
  assert.equal(payload.format, 'flowtree-plan')
  assert.equal(payload.version, 1)
  assert.equal(payload.exportedAt, exportedAt.toISOString())
  assert.deepEqual(parseFlowImport(serializeFlowData(plan, exportedAt)), plan)
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
  assert.equal(imported.tree[0].period, 'month')
  assert.equal(imported.tree[0].status, 'active')
})

test('invalid and ambiguous imports are rejected before replacement', () => {
  assert.throws(() => parseFlowImport('{bad json'), /not valid JSON/)
  assert.throws(() => parseFlowImport(JSON.stringify({ ...plan, buffer: -1 })), /buffer must be a non-negative number/)
  assert.throws(() => parseFlowImport(JSON.stringify({ ...plan, tree: [plan.tree[0], plan.tree[0]] })), /Duplicate destination id/)
  assert.throws(() => parseFlowImport(JSON.stringify({ format: 'another-app', version: 1, data: plan })), /not a Flowtree plan/)
  assert.throws(() => parseFlowImport(JSON.stringify({ format: 'flowtree-plan', version: 2, data: plan })), /version 2 is not supported/)
})
