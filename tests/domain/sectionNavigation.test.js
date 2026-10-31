import test from 'node:test'
import assert from 'node:assert/strict'
import { MOBILE_SECTIONS, sectionAfterSwipe } from '../../src/domain/sectionNavigation.js'
test('section swipes traverse all sections in order and stop at both ends', () => {
  let current = 'home'
  for (const section of MOBILE_SECTIONS.slice(1)) {
    current = sectionAfterSwipe(current, -100, 5)
    assert.equal(current, section.id)
  }
  assert.equal(sectionAfterSwipe(current, -100, 0), 'ledger')
  for (const section of MOBILE_SECTIONS.slice(0,-1).reverse()) {
    current = sectionAfterSwipe(current, 100, 5)
    assert.equal(current, section.id)
  }
  assert.equal(sectionAfterSwipe(current, 100, 0), 'home')
  assert.ok(!MOBILE_SECTIONS.some(section => ['more','account'].includes(section.id)))
})
test('short, vertical, diagonal and unknown-section gestures do not navigate', () => {
  for (const [dx,dy] of [[20,0],[50,90],[60,50],[0,100]]) assert.equal(sectionAfterSwipe('loans',dx,dy),'loans')
  assert.equal(sectionAfterSwipe('unknown',-100,0),'unknown')
})
