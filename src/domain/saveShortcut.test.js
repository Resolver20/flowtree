import test from 'node:test'
import assert from 'node:assert/strict'
import { isSaveShortcut } from './saveShortcut.js'

test('save accepts Command+S and Control+S without taking other shortcuts', () => {
  assert.equal(isSaveShortcut({ key: 's', metaKey: true }), true)
  assert.equal(isSaveShortcut({ key: 'S', ctrlKey: true }), true)
  for (const event of [{ key: 's' }, { key: 'z', ctrlKey: true }, { key: 's', ctrlKey: true, shiftKey: true }, { key: 's', metaKey: true, altKey: true }]) {
    assert.equal(Boolean(isSaveShortcut(event)), false)
  }
})
