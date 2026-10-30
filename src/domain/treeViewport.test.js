import test from 'node:test'
import assert from 'node:assert/strict'
import { createTreeLayout } from '../features/flowtree/treeLayout.js'

const tree = [{ id: 'root', children: [{ id: 'child', children: [{ id: 'leaf', children: [] }] }] }]
const makeLayout = (browserSize, viewport) => createTreeLayout({ tree, path: [], allocations: [], expandAll: true, browserSize, viewport })

test('a narrow canvas preserves readable card size without hiding its first node', () => {
  const viewport = { width: 876, height: 917 }
  const layout = makeLayout({ width: 1100, height: 1109 }, viewport)
  assert.equal(layout.scale, 1)
  assert.ok(layout.personPoint.x - 36 >= 0)
  assert.ok(layout.incomeSourcePoints[0].x - 98 >= 0)
})

test('a short canvas keeps cards at full size rather than shrinking the information', () => {
  const viewport = { width: 1142, height: 576 }
  const layout = makeLayout({ width: 1366, height: 768 }, viewport)
  assert.equal(layout.scale, 1)
})

test('scrollable tablet and short desktop layouts keep the first node inside the world', () => {
  for (const browserSize of [{ width: 768, height: 1024 }, { width: 1366, height: 600 }]) {
    const layout = makeLayout(browserSize, { width: browserSize.width - 224, height: browserSize.height - 192 })
    assert.ok(layout.personPoint.x - 36 >= 0)
    assert.ok(layout.incomeSourcePoints[0].x - 98 >= 0)
  }
})
