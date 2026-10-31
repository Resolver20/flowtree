import test from 'node:test'
import assert from 'node:assert/strict'
import { bindCanvasGestures, clampCanvasZoom, minimumCanvasZoom } from '../../src/features/flowtree/canvasGestures.js'

function setup(enabled = true) {
  const handlers = new Map()
  let zoom = 1
  let locked = false
  const changes = []
  const element = {
    addEventListener(name, handler, options) { assert.equal(options.passive, false); handlers.set(name, handler) },
    removeEventListener(name, handler) { assert.equal(handlers.get(name), handler); handlers.delete(name) },
  }
  const cleanup = bindCanvasGestures(element, { enabled, isLocked: () => locked, getZoom: () => zoom, onZoom: (value, point) => { zoom = value; changes.push({ value, point }) } })
  return { handlers, changes, cleanup, lock: value => { locked = value }, send(name, fields = {}) {
    let prevented = false
    handlers.get(name)({ ...fields, preventDefault: () => { prevented = true } })
    return prevented
  } }
}
const touches = distance => [{ clientX: 100, clientY: 50 }, { clientX: 100 + distance, clientY: 50 }]

test('mobile canvas leaves native scrolling and browser gestures untouched', () => {
  const state = setup(false)
  assert.equal(state.handlers.size, 0)
  assert.deepEqual(state.changes, [])
  state.cleanup()
  assert.equal(state.handlers.size, 0)
})

test('canvas zoom stays within its measured minimum and 160% maximum', () => {
  assert.equal(clampCanvasZoom(0.1, 0.32), 0.32)
  assert.equal(clampCanvasZoom(3), 1.6)
  assert.equal(clampCanvasZoom(1), 1)
})

test('zoom-out stops before centered empty margins exceed 40% on either axis', () => {
  for (const [viewport, content] of [
    [{ width: 1000, height: 800 }, { width: 500, height: 400 }],
    [{ width: 1000, height: 800 }, { width: 2000, height: 1000 }],
    [{ width: 350, height: 600 }, { width: 350, height: 1800 }],
  ]) {
    const minimum = minimumCanvasZoom(viewport, content)
    assert.ok((viewport.width - content.width * minimum) / (2 * viewport.width) <= 0.4)
    assert.ok((viewport.height - content.height * minimum) / (2 * viewport.height) <= 0.4)
    assert.equal(clampCanvasZoom(0.001, minimum), minimum)
  }
  assert.equal(minimumCanvasZoom({ width: 1000, height: 800 }, { width: 500, height: 400 }), 0.4)
  assert.equal(minimumCanvasZoom({ width: 1000, height: 800 }, { width: 2000, height: 1000 }), 0.16)
})

test('zoom limits recalculate for canvas size and changed branches, with safe empty geometry', () => {
  const canvas = { width: 1000, height: 800 }
  const small = minimumCanvasZoom(canvas, { width: 500, height: 400 })
  const expanded = minimumCanvasZoom(canvas, { width: 1000, height: 800 })
  assert.ok(expanded < small)
  assert.ok(minimumCanvasZoom({ width: 1500, height: 1200 }, { width: 500, height: 400 }) > small)
  assert.equal(minimumCanvasZoom(canvas, { width: 0, height: 0 }), 0.01)
  assert.equal(minimumCanvasZoom({ width: 10000, height: 8000 }, { width: 100, height: 100 }), 1.6)
})

test('trackpad pinch zooms locally around the pointer while regular wheel scroll stays native', () => {
  const state = setup()
  assert.equal(state.send('wheel', { deltaY: 10 }), false)
  assert.equal(state.changes.length, 0)
  assert.equal(state.send('wheel', { ctrlKey: true, deltaY: 20, clientX: 240, clientY: 180 }), true)
  assert.ok(state.changes[0].value < 1)
  assert.deepEqual(state.changes[0].point, { x: 240, y: 180 })
  state.send('wheel', { ctrlKey: true, deltaY: -1000 })
  assert.equal(state.changes.at(-1).value, 1.6)
  state.cleanup()
  assert.equal(state.handlers.size, 0)
})

test('two-finger touch pinch changes zoom in both directions and clears its baseline on cancel', () => {
  const state = setup()
  state.send('touchstart', { touches: touches(100) })
  state.send('touchmove', { touches: touches(150) })
  assert.equal(state.changes.at(-1).value, 1.5)
  assert.deepEqual(state.changes.at(-1).point, { x: 175, y: 50 })
  state.send('touchmove', { touches: touches(80) })
  assert.equal(state.changes.at(-1).value, 0.8)
  state.send('touchcancel')
  state.send('touchmove', { touches: touches(200) })
  assert.equal(state.changes.length, 2)
  assert.equal(state.send('touchmove', { touches: [touches(100)[0]] }), false)
})

test('pin locks only zoom: wheel, horizontal scroll and one-finger panning stay native', () => {
  const state = setup()
  state.lock(true)
  assert.equal(state.send('wheel', { deltaY: 30 }), false)
  assert.equal(state.send('wheel', { deltaX: 60 }), false)
  assert.equal(state.send('touchstart', { touches: [touches(100)[0]] }), false)
  assert.equal(state.send('touchmove', { touches: [touches(100)[0]] }), false)
  assert.equal(state.send('wheel', { ctrlKey: true, deltaY: 30 }), true)
  state.send('touchstart', { touches: touches(100) })
  assert.equal(state.send('touchmove', { touches: touches(150) }), true)
  state.send('gesturestart')
  state.send('gesturechange', { scale: 1.3 })
  assert.equal(state.changes.length, 0)
  state.lock(false)
  state.send('touchend')
  state.send('gesturestart')
  state.send('gesturechange', { scale: 0.7, clientX: 80, clientY: 90 })
  assert.equal(state.changes.at(-1).value, 0.7)
  assert.equal(state.send('wheel', { deltaY: 30 }), false)
})
