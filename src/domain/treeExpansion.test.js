import test from 'node:test'
import assert from 'node:assert/strict'
import { toggleBranch } from './treeExpansion.js'
import { createTreeLayout } from '../features/flowtree/treeLayout.js'

const tree = [
  { id: 'parent', children: [
    { id: 'child', children: [{ id: 'grandchild', children: [{ id: 'leaf', children: [] }] }] },
    { id: 'direct-leaf', children: [] },
  ] },
  { id: 'other', children: [{ id: 'other-child', children: [] }] },
]
const visibleIds = collapsedPaths => createTreeLayout({ tree, collapsedPaths, path: [], allocations: [], expandAll: true, viewport: { width: 1366, height: 768 } })
  .positionedColumns.flatMap(column => column.items.map(entry => entry.item.id))

test('closing then reopening a card shows immediate children, not grandchildren', () => {
  const original = new Set()
  const closed = toggleBranch(tree, original, ['parent'])
  assert.deepEqual(visibleIds(closed), ['parent', 'other', 'other-child'])
  const reopened = toggleBranch(tree, closed, ['parent'])
  assert.deepEqual(visibleIds(reopened), ['parent', 'other', 'child', 'direct-leaf', 'other-child'])
  assert.equal(original.size, 0)
  assert.deepEqual([...closed], ['parent'])
})

test('opening the next child reveals one more level and leaves other branches alone', () => {
  const reopened = toggleBranch(tree, new Set(['parent', 'other']), ['parent'])
  const openedChild = toggleBranch(tree, reopened, ['parent', 'child'])
  assert.deepEqual(visibleIds(openedChild), ['parent', 'other', 'child', 'direct-leaf', 'grandchild'])
  assert.equal(openedChild.has('other'), true)
  assert.equal(openedChild.has('parent/child/grandchild'), true)
  const closedChild = toggleBranch(tree, openedChild, ['parent', 'child'])
  assert.deepEqual(visibleIds(closedChild), visibleIds(reopened))
})
