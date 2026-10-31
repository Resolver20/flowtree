import test from 'node:test'
import assert from 'node:assert/strict'
import worker from '../../server/worker.js'
import { SessionStore } from '../../server/sessionStore.js'
import { boundedBody, configuration, cookie, digest, googleFetch, randomSecret, seal, unseal, validateTokens } from '../../server/security.js'
import { authorizedDriveFetch, SERVER_SESSION } from '../../src/lib/serverAuth.js'

const origin = 'https://flowtree.example'

test('Google requests use workerd-compatible manual redirects and never follow credential-bearing redirects', async t => {
  let calls = 0
  t.mock.method(globalThis, 'fetch', async (_url, options) => {
    calls++
    assert.equal(options.redirect, 'manual')
    assert.ok(options.signal instanceof AbortSignal)
    return new Response('', { status: 302, headers: { Location: 'https://untrusted.invalid/' } })
  })
  await assert.rejects(googleFetch('https://oauth2.googleapis.com/token', { method: 'POST' }), /Unexpected upstream redirect/)
  assert.equal(calls, 1)
})
function fixture() {
  const objects = new Map()
  const env = { APP_ORIGIN: origin, GOOGLE_CLIENT_ID: 'test-client', GOOGLE_CLIENT_SECRET: 'test-secret', AUTH_ENCRYPTION_KEY: randomSecret() }
  env.AUTH_RATE_LIMIT = { limit: async () => ({ success: true }) }
  env.SESSIONS = {
    idFromName: name => name,
    get(id) {
      if (!objects.has(id)) {
        const values = new Map()
        const storage = { get: async key => values.get(key), put: async (key, value) => values.set(key, value), deleteAll: async () => values.clear(), setAlarm: async () => {}, deleteAlarm: async () => {} }
        objects.set(id, { object: new SessionStore({ id, storage }, env), values })
      }
      return objects.get(id).object
    },
  }
  const request = (path, { method = 'GET', cookie: cookies, headers = {}, body } = {}) => worker.fetch(new Request(`${origin}${path}`, { method, headers: { 'X-Flowtree-Request': '1', ...(method !== 'GET' ? { Origin: origin } : {}), ...(cookies ? { Cookie: cookies } : {}), ...headers }, ...(body ? { body } : {}) }), env)
  return { env, objects, request }
}

async function signedIn(f, { expired = false } = {}) {
  const secret = randomSecret()
  const id = await digest(secret)
  const object = f.env.SESSIONS.get(id)
  await object.fetch(new Request('https://internal/create', { method: 'POST', body: JSON.stringify({ kind: 'session', expiresAt: Date.now() + 60_000, payload: { accessToken: 'private-access', refreshToken: 'private-refresh', accessExpiresAt: Date.now() + (expired ? -1 : 3600_000), user: { emailAddress: 'test@example.com' } } }) }))
  return { secret, id, object, cookies: `__Host-flowtree_session=${secret}` }
}

test('credentials are authenticated encrypted at rest and bound to their object', async () => {
  const key = randomSecret()
  const value = await seal({ refreshToken: 'private-refresh' }, key, 'object-a')
  assert.ok(!JSON.stringify(value).includes('private-refresh'))
  assert.deepEqual(await unseal(value, key, 'object-a'), { refreshToken: 'private-refresh' })
  await assert.rejects(unseal(value, key, 'object-b'))
  await assert.rejects(unseal(value, randomSecret(), 'object-a'))
})

test('production cookies cannot be read by JavaScript and require HTTPS', () => {
  assert.match(cookie('session', randomSecret(), 100, { local: false }), /^__Host-flowtree_session=.*; Path=\/; HttpOnly; SameSite=Lax; Max-Age=100; Secure$/)
  assert.throws(() => configuration({ APP_ORIGIN: 'http://flowtree.example', DEV_INSECURE_COOKIES: 'true' }))
})

test('missing configuration is a safe anonymous state, never a credential leak', async () => {
  const response = await worker.fetch(new Request(`${origin}/auth/session`), {})
  assert.equal(response.status, 200)
  assert.deepEqual((await response.json()).authenticated, false)
  assert.equal(response.headers.get('Cache-Control'), 'no-store')
})

test('login rejects cross-origin requests and missing CSRF header', async () => {
  const f = fixture()
  for (const headers of [{ Origin: 'https://evil.example' }, { 'X-Flowtree-Request': '' }, { 'Sec-Fetch-Site': 'cross-site' }]) {
    assert.equal((await f.request('/auth/login', { method: 'POST', headers })).status, 403)
  }
  assert.equal(f.objects.size, 0)
})

test('OAuth uses offline access, PKCE, fixed redirect, and one-use cookie-bound state', async () => {
  const f = fixture()
  const response = await f.request('/auth/login', { method: 'POST' })
  const url = new URL((await response.json()).url)
  assert.equal(url.searchParams.get('redirect_uri'), `${origin}/auth/callback`)
  assert.equal(url.searchParams.get('access_type'), 'offline')
  assert.equal(url.searchParams.get('code_challenge_method'), 'S256')
  assert.ok(!url.href.includes('test-secret'))
  const state = url.searchParams.get('state')
  const cookies = response.headers.get('Set-Cookie').split(';')[0]
  // A different browser cannot consume the transaction.
  assert.match((await f.request(`/auth/callback?state=${state}&error=access_denied`)).headers.get('Location'), /auth_error=invalid/)
  assert.match((await f.request(`/auth/callback?state=${state}&error=access_denied`, { cookie: cookies })).headers.get('Location'), /auth_error=denied/)
  assert.match((await f.request(`/auth/callback?state=${state}&code=replay`, { cookie: cookies })).headers.get('Location'), /auth_error=expired/)
})

test('login throttling does not create OAuth records', async () => {
  const f = fixture()
  f.env.AUTH_RATE_LIMIT.limit = async () => ({ success: false })
  assert.equal((await f.request('/auth/login', { method: 'POST' })).status, 429)
  assert.equal(f.objects.size, 0)
})

test('OAuth callback exchanges code only on server, rotates session, and exposes no Google token', async t => {
  const f = fixture()
  const old = await signedIn(f)
  const login = await f.request('/auth/login', { method: 'POST' })
  const authorization = new URL((await login.json()).url)
  const state = authorization.searchParams.get('state')
  const oauthCookie = login.headers.get('Set-Cookie').split(';')[0]
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    if (url === 'https://oauth2.googleapis.com/token') {
      assert.equal(options.body.get('client_secret'), 'test-secret')
      assert.equal(await digest(options.body.get('code_verifier')), authorization.searchParams.get('code_challenge'))
      return Response.json({ access_token: 'private-access', refresh_token: 'private-refresh', token_type: 'Bearer', expires_in: 3600 })
    }
    return Response.json({ user: { emailAddress: 'test@example.com' } })
  })
  const response = await f.request(`/auth/callback?state=${state}&code=test-code`, { cookie: `${oauthCookie}; ${old.cookies}` })
  assert.equal(response.status, 303)
  assert.equal(response.headers.get('Location'), `${origin}/`)
  assert.ok(![...response.headers.values()].join().includes('private-'))
  assert.equal((await f.request('/auth/session', { cookie: old.cookies }).then(r => r.json())).authenticated, false)
  const next = response.headers.getSetCookie().find(value => value.startsWith('__Host-flowtree_session='))?.split(';')[0]
  assert.ok(next)
  assert.equal((await f.request('/auth/session', { cookie: next }).then(r => r.json())).authenticated, true)
})

test('a new Worker request restores the same server session without browser storage', async () => {
  const f = fixture()
  const session = await signedIn(f)
  for (let i = 0; i < 2; i++) {
    const response = await f.request('/auth/session', { cookie: session.cookies })
    assert.deepEqual(await response.json(), { configured: true, authenticated: true, user: { emailAddress: 'test@example.com' } })
  }
  assert.ok(!JSON.stringify([...f.objects.get(session.id).values.values()]).includes('private-'))
})

test('expired access refreshes once across concurrent requests; logout cannot resurrect it', async t => {
  const f = fixture()
  const session = await signedIn(f, { expired: true })
  let refreshed = 0
  t.mock.method(globalThis, 'fetch', async () => {
    refreshed++
    return Response.json({ access_token: 'renewed', token_type: 'Bearer', expires_in: 3600 })
  })
  const internal = path => session.object.fetch(new Request(`https://internal/${path}`, { method: 'POST' }))
  const results = await Promise.all([internal('access'), internal('access'), internal('destroy'), internal('access')])
  assert.equal(refreshed, 1)
  assert.equal(results[0].status, 200)
  assert.equal(results[1].status, 200)
  assert.equal(results[3].status, 401)
})

test('refresh outage preserves sign-in; revoked refresh credential requires reconnect', async t => {
  const f = fixture()
  const session = await signedIn(f, { expired: true })
  let revoked = false
  t.mock.method(globalThis, 'fetch', async () => Response.json({ error: revoked ? 'invalid_grant' : 'temporarily_unavailable' }, { status: revoked ? 400 : 503 }))
  const access = () => session.object.fetch(new Request('https://internal/access', { method: 'POST' }))
  assert.equal((await access()).status, 503)
  assert.equal((await f.request('/auth/session', { cookie: session.cookies }).then(r => r.json())).authenticated, true)
  revoked = true
  assert.equal((await access()).status, 401)
  assert.equal((await f.request('/auth/session', { cookie: session.cookies }).then(r => r.json())).authenticated, false)
})

test('logout deletes the backend record and expires the browser cookie', async () => {
  const f = fixture()
  const session = await signedIn(f)
  const response = await f.request('/auth/logout', { method: 'POST', cookie: session.cookies })
  assert.equal(response.status, 200)
  assert.match(response.headers.get('Set-Cookie'), /Max-Age=0/)
  assert.equal((await f.request('/auth/session', { cookie: session.cookies }).then(r => r.json())).authenticated, false)
})

test('Drive proxy rejects anonymous, cross-site, permission and deletion requests', async () => {
  const f = fixture()
  assert.equal((await f.request('/api/drive/files')).status, 401)
  const session = await signedIn(f)
  for (const path of ['/api/drive/files/abc/permissions', '/api/upload/files/abc?uploadType=resumable']) {
    const response = await f.request(path, { cookie: session.cookies, method: 'DELETE' })
    assert.equal(response.status, 405)
  }
  assert.equal((await f.request('/api/drive/files', { cookie: session.cookies, headers: { 'Sec-Fetch-Site': 'cross-site' } })).status, 403)
})

test('Drive proxy inserts credentials privately, sanitizes Google errors and never caches data', async t => {
  const f = fixture()
  const session = await signedIn(f)
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, 'https://www.googleapis.com/drive/v3/files?fields=files(id)')
    assert.equal(options.headers.Authorization, 'Bearer private-access')
    return Response.json({ error: { message: 'sensitive upstream detail' } }, { status: 403 })
  })
  const response = await f.request('/api/drive/files?fields=files(id)', { cookie: session.cookies, headers: { Authorization: 'Bearer attacker' } })
  assert.equal(response.status, 403)
  assert.equal(response.headers.get('Cache-Control'), 'no-store')
  assert.ok(!(await response.text()).includes('sensitive'))
})

test('browser server transport sends cookies and no Authorization or Google token', async t => {
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, '/api/drive/files')
    assert.equal(options.headers.has('Authorization'), false)
    assert.equal(options.headers.get('X-Flowtree-Request'), '1')
    assert.equal(options.credentials, 'same-origin')
    return Response.json({})
  })
  await authorizedDriveFetch('https://www.googleapis.com/drive/v3', '/files', SERVER_SESSION, { headers: { Authorization: 'must-be-removed' } })
})

test('early Google 401 refreshes on the server and retries exactly once', async t => {
  const f = fixture()
  const session = await signedIn(f)
  let refreshed = 0
  let reads = 0
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    if (url === 'https://oauth2.googleapis.com/token') {
      refreshed++
      return Response.json({ access_token: 'renewed', token_type: 'Bearer', expires_in: 3600 })
    }
    reads++
    return options.headers.Authorization === 'Bearer renewed' ? Response.json({ files: [] }) : new Response('', { status: 401 })
  })
  assert.equal((await f.request('/api/drive/files', { cookie: session.cookies })).status, 200)
  assert.equal(refreshed, 1)
  assert.equal(reads, 2)
})

test('session expiry and cleanup reject old cookies even before the browser removes them', async () => {
  const f = fixture()
  const session = await signedIn(f)
  const stored = f.objects.get(session.id).values
  const record = await unseal(stored.get('record'), f.env.AUTH_ENCRYPTION_KEY, `flowtree-session-v1:${session.id}`)
  record.expiresAt = Date.now() - 1
  stored.set('record', await seal(record, f.env.AUTH_ENCRYPTION_KEY, `flowtree-session-v1:${session.id}`))
  assert.equal((await f.request('/auth/session', { cookie: session.cookies }).then(r => r.json())).authenticated, false)
  assert.equal(stored.size, 0)
  const next = await signedIn(f)
  await next.object.alarm()
  assert.equal(f.objects.get(next.id).values.size, 0)
})

test('failed OAuth exchange preserves the previous authenticated session', async t => {
  const f = fixture()
  const existing = await signedIn(f)
  const login = await f.request('/auth/login', { method: 'POST' })
  const state = new URL((await login.json()).url).searchParams.get('state')
  t.mock.method(globalThis, 'fetch', async () => Response.json({ error: 'upstream-private-detail' }, { status: 400 }))
  const response = await f.request(`/auth/callback?state=${state}&code=failed`, { cookie: `${login.headers.get('Set-Cookie').split(';')[0]}; ${existing.cookies}` })
  assert.match(response.headers.get('Location'), /auth_error=token_rejected$/)
  assert.equal((await f.request('/auth/session', { cookie: existing.cookies }).then(r => r.json())).authenticated, true)
})

test('OAuth failures identify their step without exposing Google response details', async t => {
  let mode
  t.mock.method(globalThis, 'fetch', async url => {
    if (mode === 'connection') throw new Error('private network detail')
    if (mode === 'invalid_client') return Response.json({ error: 'invalid_client', error_description: 'private credential detail' }, { status: 401 })
    if (mode === 'unknown') return Response.json({ error: 'private-upstream-value' }, { status: 400 })
    if (url === 'https://oauth2.googleapis.com/token') return Response.json({ access_token: 'private-access', ...(mode === 'refresh_missing' ? {} : { refresh_token: 'private-refresh' }), token_type: 'Bearer', expires_in: 3600 })
    return Response.json({ error: { message: 'private account detail' } }, { status: 403 })
  })
  for (const [scenario, expected] of [['connection', 'token_connection'], ['invalid_client', 'token_invalid_client'], ['unknown', 'token_rejected'], ['refresh_missing', 'refresh_missing'], ['user', 'user_rejected']]) {
    mode = scenario
    const f = fixture()
    const login = await f.request('/auth/login', { method: 'POST' })
    const state = new URL((await login.json()).url).searchParams.get('state')
    const response = await f.request(`/auth/callback?state=${state}&code=test`, { cookie: login.headers.get('Set-Cookie').split(';')[0] })
    assert.equal(response.headers.get('Location'), `${origin}/?auth_error=${expected}`)
    assert.ok(![...response.headers.values()].join().includes('private'))
    assert.equal(response.headers.get('Cache-Control'), 'no-store')
  }
})

test('uploads validate plan, canonical metadata, and gpt parent before forwarding', async t => {
  const f = fixture()
  const session = await signedIn(f)
  const boundary = 'flowtree-test-boundary-12345'
  const body = (meta, contents = JSON.stringify({ profile: { name: 'Test' }, incomeSources: [], buffer: 0, tree: [] })) => `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(meta)}\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n${contents}\r\n--${boundary}--`
  const canonical = { name: 'flowtree-plan.json', mimeType: 'application/json', parents: ['folder'] }
  let uploads = 0
  let folderName = 'gpt'
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    if (url.includes('/upload/')) {
      uploads++
      assert.equal(options.method, 'POST')
      assert.equal(options.headers.Authorization, 'Bearer private-access')
      return Response.json({ id: 'new-plan' })
    }
    return Response.json({ id: 'folder', name: folderName, mimeType: 'application/vnd.google-apps.folder', trashed: false })
  })
  const upload = value => f.request('/api/upload/files?uploadType=multipart&fields=id', { cookie: session.cookies, method: 'POST', headers: { 'Content-Type': `multipart/related; boundary=${boundary}` }, body: value })
  assert.equal((await upload(body({ ...canonical, name: 'unrelated.json' }))).status, 400)
  assert.equal((await upload(body({ ...canonical, parents: ['folder', 'another'] }))).status, 400)
  assert.notEqual((await upload(body(canonical, '{"not":"a plan"}'))).status, 200)
  folderName = 'unrelated-folder'
  assert.equal((await upload(body(canonical))).status, 403)
  assert.equal(uploads, 0)
  folderName = 'gpt'
  assert.equal((await upload(body(canonical))).status, 200)
  assert.equal(uploads, 1)
})

test('oversized request bodies and malformed token responses are rejected', async () => {
  await assert.rejects(boundedBody(new Request(origin, { method: 'POST', body: '12345' }), 4), error => error.status === 413)
  assert.throws(() => validateTokens({ access_token: 'x', token_type: 'Bearer', expires_in: 3600 }))
  assert.throws(() => validateTokens({ access_token: 'x', refresh_token: 'r', token_type: 'Bearer', expires_in: -1 }))
})
