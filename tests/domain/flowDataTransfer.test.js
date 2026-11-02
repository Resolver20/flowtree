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

test('target-relative yearly setup survives JSON export and import', () => {
  const data = structuredClone(plan)
  Object.assign(data.tree[0].children[0], { startMode: 'target-year', startDate: '2026-05-15', dueDate: '2027-05-15' })
  const restored = parseFlowImport(serializeFlowData(data))
  assert.equal(restored.tree[0].children[0].startMode, 'target-year')
  assert.equal(restored.tree[0].children[0].startDate, '2026-05-15')
})

const withoutIds = value => {
  if (Array.isArray(value)) return value.map(withoutIds)
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).filter(([key]) => key !== 'id').map(([key, item]) => [key, withoutIds(item)]))
  return value
}

test('manual JSON generates stable missing IDs at every supported level without mutating input', () => {
  const input = withoutIds(plan)
  input.tree[0].children.push({ name: 'Nested group', children: [{ name: 'Nested bill', amount: 20 }] })
  input.monthlyHistory = { '2026-11': { income: 60000, buffer: 0, planned: 100, payments: [
    { name: 'Bill', category: 'Cash Flow', monthlyAmount: 100, dayOfMonth: 1, scheduledDate: '2026-11-01', paidDate: '' },
  ] } }
  const original = structuredClone(input)
  const imported = parseFlowImport(JSON.stringify(input))
  assert.deepEqual(input, original)
  assert.deepEqual(parseFlowImport(JSON.stringify(input)), imported)
  assert.equal(imported.tree[0].id, 'needs')
  assert.ok(imported.incomeSources[0].id)
  assert.ok(imported.generalLedgers[0].id)
  assert.ok(imported.generalLedgers[0].entries[0].id)
  assert.ok(imported.monthlyHistory['2026-11'].payments[0].id)
  const nodeIds = []
  const visit = nodes => nodes.forEach(node => { nodeIds.push(node.id); visit(node.children) })
  visit(imported.tree)
  assert.equal(nodeIds.length, new Set(nodeIds).size)
  assert.ok(nodeIds.every(id => typeof id === 'string' && id))
  assert.deepEqual(parseFlowImport(serializeFlowData(imported)), imported)
  assert.deepEqual(parseFlowImport(JSON.stringify(createFlowExport(input))).tree, imported.tree)
})

test('generated IDs skip supplied IDs even on later siblings and descendants', () => {
  const input = structuredClone(plan)
  input.incomeSources = [{ name: 'New income', amount: 10 }, { id: 'income-1', name: 'Existing income', amount: 20 }]
  input.tree = [{ name: 'Custom category', children: [{ name: 'Bill' }, { id: 'destination-1', name: 'Existing child' }] }]
  input.generalLedgers = [{ name: 'New ledger', entries: [{ description: 'New expense', amount: 1 }, { id: 'entry-1', description: 'Existing expense', amount: 2 }] }, { id: 'ledger-1', name: 'Existing ledger' }]
  const result = parseFlowImport(JSON.stringify(input))
  assert.notEqual(result.incomeSources[0].id, 'income-1')
  assert.equal(result.incomeSources[1].id, 'income-1')
  assert.notEqual(result.tree[0].id, 'destination-1')
  assert.notEqual(result.tree[0].children[0].id, 'destination-1')
  assert.equal(result.tree[0].children[1].id, 'destination-1')
  assert.notEqual(result.generalLedgers[0].id, 'ledger-1')
  assert.notEqual(result.generalLedgers[0].entries[0].id, 'entry-1')
  assert.equal(result.generalLedgers[0].entries[1].id, 'entry-1')
  assert.equal(result.generalLedgers[1].id, 'ledger-1')
})

test('blank IDs are filled while invalid supplied types and duplicates stay rejected', () => {
  const input = { profile: { name: 'Me' }, incomeSources: [], buffer: 0, tree: [
    { name: 'One', id: '' }, { name: 'Two', id: null }, { name: 'Three', id: '   ' }, { name: 'Four' },
  ] }
  const result = parseFlowImport(JSON.stringify(input))
  assert.equal(new Set(result.tree.map(node => node.id)).size, 4)
  for (const id of [123, false, [], {}, 'a'.repeat(101)]) {
    assert.throws(() => parseFlowImport(JSON.stringify({ ...input, tree: [{ name: 'Bad ID', id }] })), /\.id must/)
  }
  for (const collection of ['incomeSources', 'generalLedgers']) {
    const duplicate = { ...plan, [collection]: [{ ...plan[collection][0], id: 'same' }, { ...plan[collection][0], id: 'same' }] }
    assert.throws(() => parseFlowImport(JSON.stringify(duplicate)), /Duplicate/)
  }
  assert.throws(() => parseFlowImport(JSON.stringify({ ...input, tree: [{ id: 'same', name: 'Parent', children: [{ id: 'same', name: 'Child' }] }] })), /Duplicate destination/)
})

test('omitted built-in category IDs retain category behavior without changing supplied IDs', async () => {
  const { FLOW_GROUPS, isGoalDestination } = await import('../../src/domain/flowTree.js')
  const input = { profile: { name: 'Me' }, incomeSources: [], buffer: 0, tree: FLOW_GROUPS.map(group => ({ name: group.name, children: [{ name: `${group.name} child` }] })) }
  const result = parseFlowImport(JSON.stringify(input))
  assert.deepEqual(result.tree.map(node => node.id), FLOW_GROUPS.map(group => group.id))
  const goal = result.tree.find(node => node.id === 'goals').children[0]
  assert.equal(isGoalDestination(result.tree, goal.id), true)
  const explicit = parseFlowImport(JSON.stringify({ ...input, tree: [{ id: 'my-custom-id', name: 'Life goals' }] }))
  assert.equal(explicit.tree[0].id, 'my-custom-id')
})

test('automatic ID generation retains tree size and depth limits', () => {
  const base = { profile: { name: 'Me' }, incomeSources: [], buffer: 0 }
  const nested = depth => depth === 1 ? { name: 'Leaf' } : { name: 'Parent', children: [nested(depth - 1)] }
  assert.doesNotThrow(() => parseFlowImport(JSON.stringify({ ...base, tree: [nested(20)] })))
  assert.throws(() => parseFlowImport(JSON.stringify({ ...base, tree: [nested(21)] })), /deeper than 20/)
  assert.throws(() => parseFlowImport(JSON.stringify({ ...base, tree: Array.from({ length: 2001 }, () => ({ name: 'Item' })) })), /more than 2000/)
})
