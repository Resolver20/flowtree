import test from 'node:test'
import assert from 'node:assert/strict'
import vm from 'node:vm'
import { readFileSync } from 'node:fs'
import { serviceWorkerSource } from '../../build/pwa.js'

function worker(base = '/flowtree/') {
  const handlers = {}
  const deleted = []
  const stored = new Map()
  let fetched = 0
  const self = { location: { origin:'https://example.com' }, clients:{ claim:async () => {} }, addEventListener:(event, callback) => { handlers[event] = callback } }
  const cache = { addAll:async assets => assets.forEach(asset => stored.set(asset, `cached:${asset}`)), match:async key => stored.get(key) }
  const cacheNames = [`flowtree-shell-${encodeURIComponent(base)}-old`, 'flowtree-shell-%2Fother%2F-old', 'unrelated-cache']
  vm.runInNewContext(serviceWorkerSource({ base, assets:[`${base}index.html`,`${base}assets/app.js`], version:'new' }), { self, URL, caches:{ open:async () => cache, keys:async () => cacheNames, delete:async key => deleted.push(key) }, fetch:async () => { fetched++; return 'network' } })
  const request = (path, options = {}) => {
    let response
    handlers.fetch({ request:{ url:new URL(path, self.location.origin).href, method:'GET', mode:'cors', headers:new Headers(), ...options }, respondWith: promise => { response = promise } })
    return response
  }
  return { handlers, stored, deleted, request, fetched:() => fetched }
}

test('PWA precaches the Pages app shell and opens it offline without a network request', async () => {
  const w = worker()
  let pending
  w.handlers.install({ waitUntil: promise => { pending = promise } })
  await pending
  assert.equal(await w.request('/flowtree/', { mode:'navigate' }), 'cached:/flowtree/index.html')
  assert.equal(await w.request('/flowtree/assets/app.js'), 'cached:/flowtree/assets/app.js')
  assert.equal(w.fetched(), 0)
})

test('PWA never intercepts Google credentials, API requests, writes, or unrelated sites', () => {
  const w = worker()
  for (const [path, options] of [
    ['https://www.googleapis.com/drive/v3/files', {}],
    ['https://accounts.google.com/gsi/client', {}],
    ['/flowtree/plan.json', {}], ['/another-app/', {mode:'navigate'}],
    ['/flowtree/assets/app.js', {method:'POST'}],
    ['/flowtree/assets/app.js', {headers:new Headers({Authorization:'Bearer synthetic'})}],
    ['/flowtree/assets/app.js?token=synthetic', {}],
  ]) assert.equal(w.request(path, options), undefined)
})

test('activation removes only old Flowtree caches for its own scope', async () => {
  const w = worker()
  let pending
  w.handlers.activate({ waitUntil: promise => { pending = promise } })
  await pending
  assert.deepEqual(w.deleted, ['flowtree-shell-%2Fflowtree%2F-old'])
  assert.equal(w.handlers.message, undefined) // No forced skip-waiting/reload path.
})

test('manifest supports root and Pages paths with correctly sized phone icons', () => {
  const manifest = JSON.parse(readFileSync(new URL('../../public/manifest.webmanifest', import.meta.url)))
  for (const base of ['https://example.com/', 'https://example.com/flowtree/']) {
    assert.equal(new URL(manifest.start_url, base).href, base)
    assert.equal(new URL(manifest.scope, base).href, base)
  }
  assert.equal(manifest.display, 'standalone')
  for (const icon of manifest.icons) {
    const png = readFileSync(new URL(`../../public/${icon.src}`, import.meta.url))
    const size = Number(icon.sizes.split('x')[0])
    assert.equal(png.readUInt32BE(16), size)
    assert.equal(png.readUInt32BE(20), size)
  }
  assert.ok(manifest.icons.some(icon => icon.purpose === 'maskable'))
})
