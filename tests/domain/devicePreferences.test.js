import test from 'node:test'
import assert from 'node:assert/strict'
import { readDeviceTheme, writeDeviceTheme, rememberGoogleAccount, forgetGoogleAccount, googleReconnectOptions } from '../../src/domain/devicePreferences.js'
const storage = () => { const data = new Map(); return {getItem:key => data.get(key) ?? null, setItem:(key, value) => data.set(key, value), removeItem:key => data.delete(key)} }
test('theme survives a new app session and migrates the old preference', () => {
  const host = {localStorage:storage(), sessionStorage:storage()}
  host.sessionStorage.setItem('flowtree-theme', 'dark')
  assert.equal(readDeviceTheme(host), 'dark')
  writeDeviceTheme(host, readDeviceTheme(host))
  host.sessionStorage = storage()
  assert.equal(readDeviceTheme(host), 'dark')
  writeDeviceTheme(host, 'light')
  host.sessionStorage = storage()
  assert.equal(readDeviceTheme(host), 'light')
})
test('remembered account streamlines reconnect but explicit switching ignores hint', () => {
  const host = {localStorage:storage()}
  assert.deepEqual(googleReconnectOptions(host), {prompt:'select_account consent'})
  rememberGoogleAccount(host, 'example@example.com')
  assert.deepEqual(googleReconnectOptions(host), {prompt:'', loginHint:'example@example.com'})
  assert.deepEqual(googleReconnectOptions(host, 'select_account consent'), {prompt:'select_account consent'})
  forgetGoogleAccount(host)
  assert.deepEqual(googleReconnectOptions(host), {prompt:'select_account consent'})
})
test('blocked preference storage does not prevent startup or sign-in', () => {
  const host = { get localStorage() { throw Error('blocked') }, get sessionStorage() { throw Error('blocked') } }
  assert.equal(readDeviceTheme(host), 'light')
  writeDeviceTheme(host, 'dark')
  rememberGoogleAccount(host, 'example@example.com')
  forgetGoogleAccount(host)
  assert.deepEqual(googleReconnectOptions(host), {prompt:'select_account consent'})
})
