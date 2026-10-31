import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeCanvasPins, updateCanvasPin, pinnedNavigation } from '../../src/domain/canvasPins.js'

const pin = { zoom: 0.8, scrollLeft: 125.5, scrollTop: 340, path: ['risk', 'insurance'], collapsedPaths: ['cash/subscriptions'] }

test('canvas pins preserve separate views and last pinned navigation without mutating snapshots', () => {
  const first = updateCanvasPin(undefined, 'home', pin)
  const before = structuredClone(first)
  const both = updateCanvasPin(first, 'sinking', { ...pin, zoom: 1.2 })
  assert.deepEqual(first, before)
  assert.equal(both.home.zoom, 0.8)
  assert.equal(both.sinking.zoom, 1.2)
  assert.deepEqual(pinnedNavigation(both), { view: 'sinking', nodeId: null })
  const removed = updateCanvasPin(both, 'sinking', null)
  assert.deepEqual(removed, first)
  assert.equal(updateCanvasPin(removed, 'home', null), undefined)
  assert.equal(updateCanvasPin(first, 'ledger', pin), first)
})

test('legacy plans need no pins and malformed camera positions are rejected', () => {
  assert.equal(normalizeCanvasPins(undefined), undefined)
  assert.equal(normalizeCanvasPins({}), undefined)
  assert.equal(pinnedNavigation(undefined), undefined)
  for (const changes of [{ zoom: 0 }, { zoom: 1.7 }, { zoom: NaN }, { scrollLeft: -1 }, { scrollTop: Infinity }, { scrollTop: '20' }, { path: ['a'.repeat(101)] }, { collapsedPaths: [4] }]) {
    assert.throws(() => normalizeCanvasPins({ home: { ...pin, ...changes } }), /canvasPins/)
  }
  assert.throws(() => normalizeCanvasPins([]), /canvasPins/)
  assert.equal(normalizeCanvasPins({ home: pin, lastView: 'ledger' }).lastView, 'home')
})
