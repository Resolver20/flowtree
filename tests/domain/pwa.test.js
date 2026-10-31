import test from 'node:test'
import assert from 'node:assert/strict'
import vm from 'node:vm'
import { readFileSync } from 'node:fs'
import { serviceWorkerSource } from '../../build/pwa.js'

function worker(base = '/flowtree/', options = {}) {
  const handlers = {}
  const deleted = []
  const stored = new Map()
  let fetched = 0
  const requests = []
  const self = { location: { origin:'https://example.com' }, clients:{ claim:async () => {} }, addEventListener:(event, callback) => { handlers[event] = callback } }
  const cache = { put:async (key, response) => stored.set(key, response), match:async key => { const original = stored.get(key); if (!original) return undefined; const copy = original.clone(); if (original.redirected) Object.defineProperty(copy, 'redirected', { value: true }); return copy } }
  const cacheNames = [`flowtree-shell-${encodeURIComponent(base)}-old`, 'flowtree-shell-%2Fother%2F-old', 'unrelated-cache']
  vm.runInNewContext(serviceWorkerSource({ base, assets:[`${base}index.html`,`${base}assets/app.js`], version:'new' }), { self, URL, Request: class extends Request { constructor(input, init) { super(typeof input === 'string' ? new URL(input, self.location.origin) : input, init) } }, Response, caches:{ open:async () => cache, keys:async () => cacheNames, delete:async key => deleted.push(key) }, fetch:async request => { fetched++; requests.push(request); if (options.offline) throw new Error('offline'); const response = new Response(request.url.endsWith('index.html') ? (options.html ?? `<script src="${base}assets/app.js"></script>`) : 'bundle', { status:options.status ?? 200, headers: { 'Content-Security-Policy': "frame-ancestors 'self'" } }); if (options.redirectedShell && request.url.endsWith('index.html')) Object.defineProperty(response, 'redirected', { value: true }); return response } })
  const request = (path, options = {}) => {
    let response
    handlers.fetch({ request:{ url:new URL(path, self.location.origin).href, method:'GET', mode:'cors', headers:new Headers(), ...options }, respondWith: promise => { response = promise } })
    return response
  }
  return { handlers, stored, deleted, request, requests, options, fetched:() => fetched }
}

test('PWA precaches the Pages app shell and opens it offline without a network request', async () => {
  const w = worker()
  let pending
  w.handlers.install({ waitUntil: promise => { pending = promise } })
  await pending
  assert.match(await (await w.request('/flowtree/', { mode:'navigate' })).text(), /assets\/app.js/)
  assert.equal(await (await w.request('/flowtree/assets/app.js')).text(), 'bundle')
  assert.equal(w.fetched(), 2)
  assert.ok(w.requests.every(request => request.cache === 'reload'))
})

test('cached launches work at root and Pages scope, including launch query strings', async () => {
  for (const base of ['/', '/flowtree/']) {
    const w = worker(base)
    let pending
    w.handlers.install({ waitUntil: promise => { pending = promise } })
    await pending
    w.options.offline = true
    for (const path of [base, `${base}index.html`, `${base}?source=homescreen`]) {
      const response = await w.request(path, { mode: 'navigate' })
      assert.equal(response.status, 200)
      assert.match(await response.text(), /assets\/app.js/)
    }
    assert.equal(w.fetched(), 2)
  }
})

test('PWA never intercepts Google credentials, API requests, writes, or unrelated sites', () => {
  const w = worker()
  for (const [path, options] of [
    ['/auth/session', {}],
    ['/auth/callback?code=synthetic&state=synthetic', { mode: 'navigate' }],
    ['/api/drive/files', {}],
    ['/api/upload/files', { method: 'POST' }],
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
  const appleIcon = readFileSync(new URL('../../public/icons/apple-touch-icon.png', import.meta.url))
  assert.equal(appleIcon.readUInt32BE(16), 180)
  assert.equal(appleIcon.readUInt32BE(20), 180)
  const html = readFileSync(new URL('../../index.html', import.meta.url), 'utf8')
  assert.match(html, /name="viewport"[^>]*viewport-fit=cover/)
  assert.doesNotMatch(html, /user-scalable=no|maximum-scale=1/)
  assert.match(html, /name="apple-mobile-web-app-capable" content="yes"/)
})


test('mismatched HTML or failed release does not populate a new app cache', async () => {
  for (const options of [{html:'<script src="old.js"></script>'}, {status:404}, {offline:true}]) {
    const w = worker('/flowtree/', options)
    let pending
    w.handlers.install({waitUntil: promise => { pending = promise }})
    await assert.rejects(pending)
    assert.equal(w.stored.size, 0)
  }
})

test('missing cached bundle uses fresh navigation instead of broken old HTML', async () => {
  const w = worker('/flowtree/', { redirectedShell: true })
  let pending
  w.handlers.install({waitUntil: promise => { pending = promise }})
  await pending
  w.stored.delete('/flowtree/assets/app.js')
  // A navigation Request is represented by a real Request for the network fallback.
  const request = new Request('https://example.com/flowtree/index.html')
  Object.defineProperty(request, 'mode', {value:'navigate'})
  w.handlers.fetch({request, respondWith: promise => { pending = promise }})
  const fresh = await pending
  assert.equal(fresh.status, 200)
  assert.equal(fresh.redirected, false)
  assert.equal(w.fetched(), 3)
  assert.equal(w.requests.at(-1).cache, 'reload')
  w.options.offline = true
  w.handlers.fetch({request, respondWith: promise => { pending = promise }})
  const recovery = await pending
  assert.equal(recovery.status, 503)
  assert.match(await recovery.text(), /Try again/)
})


test('redirected index.html responses are safe for cached page navigations and OAuth return URLs', async () => {
  const w = worker('/', { redirectedShell: true })
  let pending
  w.handlers.install({ waitUntil: promise => { pending = promise } })
  await pending
  assert.equal(w.stored.get('/index.html').redirected, false)
  for (const path of ['/', '/?auth_error=token_rejected', '/?source=homescreen']) {
    const response = await w.request(path, { mode: 'navigate', redirect: 'manual' })
    assert.equal(response.redirected, false)
    assert.equal(response.status, 200)
    assert.equal(response.headers.get('Content-Security-Policy'), "frame-ancestors 'self'")
    assert.match(await response.text(), /assets\/app.js/)
  }
  // An older cached redirect must also be repaired on read.
  Object.defineProperty(w.stored.get('/index.html'), 'redirected', { value: true })
  assert.equal((await w.request('/', { mode: 'navigate', redirect: 'manual' })).redirected, false)
})
