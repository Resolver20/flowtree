import test from 'node:test'
import assert from 'node:assert/strict'
import { createTreeLayout } from '../../src/features/flowtree/treeLayout.js'

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

test('sinking funds reserves space only for its visible starting node and open columns', () => {
  const layout = createTreeLayout({ tree, path: [], allocations: [], expandAll: false, showPerson: false, incomeSourceCount: 1 })
  assert.equal(layout.incomeSourcePoints[0].x - 98, 32)
  const last = layout.positionedColumns.at(-1).items[0]
  assert.equal(layout.worldWidth - (last.point.x + 98), 32)
  assert.equal(layout.worldWidth, 730)
  const opened = createTreeLayout({ tree, path: ['root'], allocations: [], expandAll: false, showPerson: false, incomeSourceCount: 1 })
  assert.equal(opened.worldWidth - layout.worldWidth, 235)
  assert.equal(opened.incomeSourcePoints[0].x, layout.incomeSourcePoints[0].x)
})

test('a plan without income sources leaves room for the monthly-plan label', () => {
  const layout = createTreeLayout({ tree, path: [], allocations: [], expandAll: false, showPerson: false, incomeSourceCount: 0 })
  assert.equal(layout.sourcePoint.x - 130, 32)
})

test('Home → Sinking funds → Home keeps each view sized to its visible content', () => {
  const homeOptions = { tree, path: [], allocations: [], expandAll: true, showPerson: true, incomeSourceCount: 1 }
  const sinkingOptions = { ...homeOptions, expandAll: false, showPerson: false }
  const home = createTreeLayout(homeOptions)
  for (let visit = 0; visit < 3; visit++) {
    const sinking = createTreeLayout(sinkingOptions)
    assert.equal(sinking.worldWidth, 730)
    assert.equal(sinking.incomeSourcePoints[0].x - 98, 32)
    assert.equal(sinking.positionedColumns.length, 1)
    assert.equal(sinking.scale, 1)
    assert.deepEqual(createTreeLayout(homeOptions), home)
  }
})
