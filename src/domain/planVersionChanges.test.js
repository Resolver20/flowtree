import test from 'node:test'
import assert from 'node:assert/strict'
import { planVersionChanges } from './planVersionChanges.js'

test('version labels identify edits, renames, additions and deletions without marking parents changed', () => {
  const previous = { tree: [{ id: 'parent', name: 'Loans', children: [
    { id: 'house', name: 'House loan', amount: 100 },
    { id: 'rd', name: 'Recurring deposit', amount: 20 },
  ] }] }
  const current = structuredClone(previous)
  current.tree[0].children = [{ id: 'house', name: 'Home loan', amount: 110 }, { id: 'car', name: 'EV car', amount: 30 }]
  assert.deepEqual(planVersionChanges(previous, current), ['Modified: House loan → Home loan', 'Added: EV car', 'Deleted: Recurring deposit'])
  assert.equal(previous.tree[0].children.length, 2)
})

test('version labels cover income, ledger expenses, profile and buffer', () => {
  const previous = { incomeSources: [{ id: 's', name: 'Salary', amount: 10 }], generalLedgers: [{ id: 'l', name: 'Home GL', entries: [{ id: 'e', description: 'Groceries', amount: 2 }] }], profile: { name: 'Me' }, buffer: 1 }
  const current = structuredClone(previous)
  current.incomeSources[0].amount = 20
  current.generalLedgers[0].entries = []
  current.profile.name = 'You'
  current.buffer = 2
  assert.deepEqual(planVersionChanges(previous, current), ['Modified: Salary', 'Modified: Profile', 'Modified: Safety buffer', 'Deleted: Home GL: Groceries'])
})

test('missing history and unchanged plans are described honestly', () => {
  assert.deepEqual(planVersionChanges(null, {}), ['Earlier version unavailable for comparison'])
  assert.deepEqual(planVersionChanges({ profile: { name: 'Me', visible: true } }, { profile: { visible: true, name: 'Me' } }), ['No plan changes'])
})
