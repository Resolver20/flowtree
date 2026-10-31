import test from 'node:test'
import assert from 'node:assert/strict'
import { isGoalDestination } from '../../src/domain/flowTree.js'
const tree = [{ id: 'goals', children: [{ id: 'car', children: [{ id: 'deposit', children: [] }] }] }, { id: 'needs', children: [{ id: 'bill', children: [] }] }]

test('goal forms use target dates for existing, nested, and new goal destinations', () => {
  assert.equal(isGoalDestination(tree, 'car'), true)
  assert.equal(isGoalDestination(tree, 'deposit'), true)
  assert.equal(isGoalDestination(tree, undefined, 'goals'), true)
  assert.equal(isGoalDestination(tree, undefined, 'car'), true)
})

test('grouping roots and regular expense forms keep their frequency behavior', () => {
  assert.equal(isGoalDestination(tree, 'goals'), false)
  assert.equal(isGoalDestination(tree, 'bill'), false)
  assert.equal(isGoalDestination(tree, undefined, 'needs'), false)
  assert.equal(isGoalDestination(tree), false)
})
