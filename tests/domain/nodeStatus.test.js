import test from 'node:test'
import assert from 'node:assert/strict'
import { NODE_STATUSES, normalizeNodeStatus, normalizeTreeStatuses, monthlyTotal, monthlyAllocation } from '../../src/domain/flowTree.js'
import { parseFlowImport, serializeFlowData } from '../../src/domain/flowDataTransfer.js'
import { allocateEnergy } from '../../src/domain/energyFlow.js'

const child = { id: 'goal', name: 'Future goal', amount: 120000, savedAmount: 1000, period: 'year', startDate: '2027-01-01', dueDate: '2029-01-01', status: 'inactive', children: [] }
const plan = status => ({ profile: { name: 'Test', visible: true }, incomeSources: [], buffer: 0, tree: [{ id: 'parent', name: 'Parent', amount: 100, status, children: [child] }] })

test('status choices are Active and Inactive and legacy values preserve allocation behavior', () => {
  assert.deepEqual(NODE_STATUSES, ['active', 'inactive'])
  for (const [old, expected] of [['seeded', 'active'], ['active', 'active'], ['dormant', 'inactive'], ['funded', 'inactive'], ['inactive', 'inactive']]) {
    assert.equal(normalizeNodeStatus(old), expected)
    const imported = parseFlowImport(JSON.stringify(plan(old)))
    assert.equal(imported.tree[0].status, expected)
    assert.equal(monthlyTotal(imported.tree[0]), expected === 'active' ? 100 : 0)
  }
  assert.throws(() => parseFlowImport(JSON.stringify(plan('unknown'))), /status/)
})

test('inactive branches reserve no money and reactivation preserves amounts and dates', () => {
  const node = { ...plan('inactive').tree[0], children: [{ ...child, period: 'month', amount: 200, status: 'active' }] }
  assert.equal(monthlyTotal(node), 0)
  assert.equal(allocateEnergy([node], 500).remaining, 500)
  assert.equal(monthlyTotal({ ...node, status: 'active' }), 300)
  assert.equal(monthlyAllocation(child, new Date(2026, 9, 31)), 0)
  const restored = parseFlowImport(serializeFlowData(plan('active'))).tree[0].children[0]
  for (const field of ['startDate', 'dueDate', 'status', 'amount', 'savedAmount']) assert.equal(restored[field], child[field])
})

test('normalizing an in-memory legacy tree is recursive and immutable', () => {
  const original = [{ ...plan('funded').tree[0], children: [{ ...child, status: 'seeded' }] }]
  const normalized = normalizeTreeStatuses(original)
  assert.equal(normalized[0].status, 'inactive')
  assert.equal(normalized[0].children[0].status, 'active')
  assert.equal(original[0].status, 'funded')
  assert.equal(original[0].children[0].status, 'seeded')
})

test('goal tenure uses the selected start date and clamps leap days', async () => {
  const { goalTargetDate } = await import('../../src/domain/goalDates.js')
  assert.equal(goalTargetDate('2027-04-15', 3), '2030-04-15')
  assert.equal(goalTargetDate('2028-02-29', 1), '2029-02-28')
})
