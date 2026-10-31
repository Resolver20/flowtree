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

test('desktop income sources form one vertical column below Income, which connects directly to Monthly plan', () => {
  for (const incomeSourceCount of [0, 1, 3, 10]) {
    const layout = createTreeLayout({ tree, path: [], allocations: [], expandAll: true, incomeSourceCount, showPerson: true })
    assert.equal(layout.personPoint.x - 98, 32)
    for (const [index, point] of layout.incomeSourcePoints.entries()) {
      assert.equal(point.x, layout.personPoint.x + (incomeSourceCount > 1 ? 118 : 0))
      assert.equal(point.y, layout.personPoint.y + 100 + index * 80)
      assert.ok(point.y + 28 <= layout.height - 32)
      assert.ok(point.x + 98 < layout.sourcePoint.x - 120)
    }
    assert.equal(layout.sourcePoint.y, layout.personPoint.y)
    assert.equal(layout.introPaths[0], `M ${layout.personPoint.x + 98} ${layout.personPoint.y} H ${layout.sourcePoint.x - 38}`)
    assert.equal(layout.introPaths.length, incomeSourceCount + (incomeSourceCount > 1 ? 2 : 1))
    if (incomeSourceCount > 1) {
      assert.equal(layout.introPaths[1], `M ${layout.personPoint.x} ${layout.personPoint.y + 28} V ${layout.incomeSourcePoints.at(-1).y}`)
      layout.incomeSourcePoints.forEach((point, index) => {
        assert.equal(layout.introPaths[index + 2], `M ${layout.personPoint.x} ${point.y} H ${point.x - 98}`)
      })
    } else if (incomeSourceCount === 1) {
      const point = layout.incomeSourcePoints[0]
      assert.equal(layout.introPaths[1], `M ${point.x} ${layout.personPoint.y + 28} V ${point.y - 28}`)
    }
    assert.ok(layout.personPoint.x + 98 < layout.sourcePoint.x - 36)
  }
})

test('scrollable tablet and short desktop layouts keep the first node inside the world', () => {
  for (const browserSize of [{ width: 768, height: 1024 }, { width: 1366, height: 600 }]) {
    const layout = makeLayout(browserSize, { width: browserSize.width - 224, height: browserSize.height - 192 })
    assert.ok(layout.personPoint.x - 36 >= 0)
    assert.ok(layout.incomeSourcePoints[0].x - 98 >= 0)
  }
})

test('Monthly plan summary clears curved connectors on both sides with room for child cards', () => {
  const branches = [{ id: 'first', children: [{ id: 'first-child', children: [] }] }, { id: 'second', children: [] }, { id: 'third', children: [] }]
  for (const expandAll of [true, false]) {
    const layout = createTreeLayout({ tree: branches, path: ['first'], allocations: [], expandAll, incomeSourceCount: 5, showPerson: true })
    const summaryLeft = layout.sourcePoint.x - 120
    const summaryRight = layout.sourcePoint.x + 120
    for (const point of layout.positionedColumns[0].items.map(entry => entry.point)) {
      const start = layout.sourcePoint.x + 40, end = point.x - 98
      const outgoingTrunk = start + (end - start) * .52
      assert.ok(outgoingTrunk - 18 >= summaryRight + 16)
    }
    for (const point of layout.incomeSourcePoints) assert.ok(point.x + 98 <= summaryLeft - 16)
    if (layout.positionedColumns[1]?.items.length) {
      const child = layout.positionedColumns[1].items[0].point
      const parent = layout.positionedColumns[0].items[0].point
      assert.ok(child.x - parent.x - 196 >= 80)
    }
  }
})

test('sinking funds reserves space only for its visible starting node and open columns', () => {
  const layout = createTreeLayout({ tree, path: [], allocations: [], expandAll: false, showPerson: false, incomeSourceCount: 0 })
  assert.deepEqual(layout.incomeSourcePoints, [])
  assert.equal(layout.sourcePoint.x - 130, 32)
  const last = layout.positionedColumns.at(-1).items[0]
  assert.equal(layout.worldWidth - (last.point.x + 98), 32)
  assert.equal(layout.worldWidth, 542)
  const opened = createTreeLayout({ tree, path: ['root'], allocations: [], expandAll: false, showPerson: false, incomeSourceCount: 0 })
  assert.equal(opened.worldWidth - layout.worldWidth, 280)
  assert.equal(opened.sourcePoint.x, layout.sourcePoint.x)
  assert.ok(layout.connectorGroups[0].d.startsWith(`M ${layout.sourcePoint.x + 40} ${layout.sourcePoint.y}`))
})

test('a plan without income sources leaves room for the monthly-plan label', () => {
  const layout = createTreeLayout({ tree, path: [], allocations: [], expandAll: false, showPerson: false, incomeSourceCount: 0 })
  assert.equal(layout.sourcePoint.x - 130, 32)
})

test('Home → Sinking funds → Home keeps each view sized to its visible content', () => {
  const homeOptions = { tree, path: [], allocations: [], expandAll: true, showPerson: true, incomeSourceCount: 1 }
  const sinkingOptions = { ...homeOptions, expandAll: false, showPerson: false, incomeSourceCount: 0 }
  const home = createTreeLayout(homeOptions)
  for (let visit = 0; visit < 3; visit++) {
    const sinking = createTreeLayout(sinkingOptions)
    assert.equal(sinking.worldWidth, 542)
    assert.deepEqual(sinking.incomeSourcePoints, [])
    assert.equal(sinking.sourcePoint.x - 130, 32)
    assert.equal(sinking.positionedColumns.length, 1)
    assert.equal(sinking.scale, 1)
    assert.deepEqual(createTreeLayout(homeOptions), home)
  }
})
