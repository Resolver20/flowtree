import test from 'node:test'
import assert from 'node:assert/strict'
import { bindDialogViewport } from '../../src/features/flowtree/dialogViewport.js'

function fixture({ width = 390, viewport = true } = {}) {
  const host = new EventTarget()
  host.innerHeight = 844
  host.matchMedia = () => ({ matches: width <= 760 })
  host.visualViewport = viewport ? Object.assign(new EventTarget(), { height: 844, offsetTop: 0 }) : null
  let pending
  host.requestAnimationFrame = callback => { pending = callback; return 1 }
  host.cancelAnimationFrame = () => { pending = null }
  const properties = new Map()
  let scrolls = 0
  const input = { matches: () => true, getBoundingClientRect: () => ({ top: 300, bottom: 344 }) }
  const element = Object.assign(new EventTarget(), {
    getBoundingClientRect: () => ({ top: 12, bottom: 372 }),
    querySelector: () => ({ getBoundingClientRect: () => ({ top: 300 }) }),
    style: { setProperty: (key, value) => properties.set(key, value), removeProperty: key => properties.delete(key) },
    ownerDocument: { activeElement: input }, contains: candidate => candidate === input,
  })
  Object.defineProperty(element, 'scrollTop', { get: () => 0, set: value => { if (value > 0) scrolls++ } })
  return { host, element, properties, scrolls: () => scrolls, flush: () => pending?.(), setWidth: value => { width = value } }
}

test('phone dialog follows keyboard height and viewport pan, then restores on keyboard dismissal', () => {
  const f = fixture()
  const release = bindDialogViewport(f.element, f.host)
  assert.equal(f.properties.get('--dialog-visible-height'), '844px')
  f.host.visualViewport.height = 360
  f.host.visualViewport.offsetTop = 80
  f.host.visualViewport.dispatchEvent(new Event('resize'))
  f.flush()
  assert.equal(f.properties.get('--dialog-visible-height'), '360px')
  assert.equal(f.properties.get('--dialog-visible-top'), '80px')
  assert.equal(f.scrolls(), 1)
  f.host.visualViewport.offsetTop = 100
  f.host.visualViewport.dispatchEvent(new Event('scroll'))
  assert.equal(f.properties.get('--dialog-visible-top'), '100px')
  f.host.visualViewport.height = 844
  f.host.visualViewport.offsetTop = 0
  f.host.visualViewport.dispatchEvent(new Event('resize'))
  assert.equal(f.properties.get('--dialog-visible-height'), '844px')
  release()
  assert.equal(f.properties.size, 0)
  f.host.visualViewport.dispatchEvent(new Event('resize'))
  f.host.dispatchEvent(new Event('resize'))
  f.flush()
  assert.equal(f.properties.size, 0)
  assert.equal(f.scrolls(), 1)
})

test('desktop uses its normal dialog layout; resizing back to mobile and fallback browsers work', () => {
  const f = fixture({ width: 1024, viewport: false })
  const release = bindDialogViewport(f.element, f.host)
  assert.equal(f.properties.size, 0)
  f.setWidth(390)
  f.host.innerHeight = 400
  f.host.dispatchEvent(new Event('resize'))
  assert.equal(f.properties.get('--dialog-visible-height'), '400px')
  assert.equal(f.properties.get('--dialog-visible-top'), '0px')
  f.setWidth(1024)
  f.host.dispatchEvent(new Event('resize'))
  f.flush()
  assert.equal(f.properties.size, 0)
  assert.equal(f.scrolls(), 0)
  release()
})
