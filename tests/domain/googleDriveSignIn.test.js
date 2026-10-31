import test from 'node:test'
import assert from 'node:assert/strict'

// Fresh module per case gives each fake browser a fresh script-loader cache.
async function fakeBrowser(t, behavior = {}) {
  const scripts = []
  const previousWindow = globalThis.window
  const previousDocument = globalThis.document
  globalThis.window = { setTimeout, clearTimeout }
  globalThis.document = {
    createElement: () => ({ remove() { this.removed = true } }),
    head: { append(script) { scripts.push(script) } },
  }
  t.after(() => { globalThis.window = previousWindow; globalThis.document = previousDocument })
  let requested = 0
  const install = () => {
    window.google = { accounts: { oauth2: { initTokenClient(options) {
      return { requestAccessToken() {
        requested++
        if (behavior.error) options.error_callback({ type: behavior.error })
        else options.callback({ access_token: 'test-token' })
      } }
    } } } }
  }
  const api = await import(`../../src/lib/googleDriveSync.js?case=${crypto.randomUUID()}`)
  return { api, scripts, install, requested: () => requested }
}

test('cold startup prepares one SDK without opening authorization; first ready click requests synchronously', async t => {
  const browser = await fakeBrowser(t)
  const first = browser.api.prepareGoogleDriveSignIn()
  const second = browser.api.prepareGoogleDriveSignIn()
  assert.equal(browser.scripts.length, 1)
  assert.equal(browser.requested(), 0)
  browser.install()
  browser.scripts[0].onload()
  await Promise.all([first, second])
  const signIn = browser.api.connectGoogleDrive({ clientId: 'test-client' })
  // No timer, network await or microtask between the click and popup request.
  assert.equal(browser.requested(), 1)
  assert.equal(await signIn, 'test-token')
})

test('an unprepared sign-in never opens a delayed popup', async t => {
  const browser = await fakeBrowser(t)
  await assert.rejects(browser.api.connectGoogleDrive({ clientId: 'test-client' }), /still loading/)
  assert.equal(browser.scripts.length, 0)
  assert.equal(browser.requested(), 0)
})

test('failed SDK load can retry and a loaded script must expose OAuth', async t => {
  const browser = await fakeBrowser(t)
  const first = browser.api.prepareGoogleDriveSignIn()
  browser.scripts[0].onerror()
  await assert.rejects(first, /could not be loaded/)
  assert.equal(browser.scripts[0].removed, true)
  const second = browser.api.prepareGoogleDriveSignIn()
  browser.scripts[1].onload()
  await assert.rejects(second, /could not initialize/)
  const third = browser.api.prepareGoogleDriveSignIn()
  browser.install()
  browser.scripts[2].onload()
  await third
  assert.equal(browser.api.isGoogleDriveSignInReady(), true)
})

for (const [error, expected] of [['popup_failed_to_open', /Allow popups/], ['popup_closed', /closed before it finished/]]) {
  test(`${error} gives an actionable sign-in message`, async t => {
    const browser = await fakeBrowser(t, { error })
    browser.install()
    await assert.rejects(browser.api.connectGoogleDrive({ clientId: 'test-client' }), expected)
  })
}
