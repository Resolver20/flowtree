import { configuration, cookie, digest, googleFetch, json, OAUTH_SECONDS, randomSecret, readCookie, requireSameOrigin, SESSION_SECONDS, SCOPE, validateTokens } from './security.js'
import { proxyDrive } from './driveProxy.js'
export { SessionStore } from './sessionStore.js'

async function store(env, secret, action, body) {
  const id = env.SESSIONS.idFromName(await digest(secret))
  return env.SESSIONS.get(id).fetch(new Request(`https://internal/${action}`, { method: 'POST', ...(body ? { body: JSON.stringify(body) } : {}) }))
}

function redirect(config, error, cookies = []) {
  const headers = new Headers({ Location: `${config.origin}/${error ? `?auth_error=${error}` : ''}`, 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' })
  for (const value of cookies) headers.append('Set-Cookie', value)
  return new Response(null, { status: 303, headers })
}

async function callback(request, env, config) {
  const clear = cookie('oauth', '', 0, config)
  try {
    const url = new URL(request.url)
    const state = readCookie(request, 'oauth', config)
    if (!state || url.searchParams.getAll('state').length !== 1 || state !== url.searchParams.get('state')) return redirect(config, 'invalid', [clear])
    const transaction = await store(env, state, 'take')
    if (!transaction.ok) return redirect(config, 'expired', [clear])
    const { verifier } = await transaction.json()
    if (url.searchParams.has('error')) return redirect(config, 'denied', [clear])
    const code = url.searchParams.get('code')
    if (!code || code.length > 4096 || url.searchParams.getAll('code').length !== 1) return redirect(config, 'invalid', [clear])
    const response = await googleFetch('https://oauth2.googleapis.com/token', { method: 'POST', body: new URLSearchParams({ code, client_id: env.GOOGLE_CLIENT_ID, client_secret: env.GOOGLE_CLIENT_SECRET, redirect_uri: `${config.origin}/auth/callback`, grant_type: 'authorization_code', code_verifier: verifier }) })
    if (!response.ok) return redirect(config, 'failed', [clear])
    const tokens = validateTokens(await response.json())
    const about = await googleFetch('https://www.googleapis.com/drive/v3/about?fields=user(displayName,emailAddress,photoLink)', { headers: { Authorization: `Bearer ${tokens.accessToken}` } })
    if (!about.ok) return redirect(config, 'failed', [clear])
    const user = (await about.json()).user
    if (!user?.emailAddress) return redirect(config, 'failed', [clear])
    const secret = randomSecret()
    const created = await store(env, secret, 'create', { kind: 'session', expiresAt: Date.now() + SESSION_SECONDS * 1000, payload: { ...tokens, user } })
    if (!created.ok) return redirect(config, 'failed', [clear])
    const previous = readCookie(request, 'session', config)
    if (previous) await store(env, previous, 'destroy')
    return redirect(config, '', [clear, cookie('session', secret, SESSION_SECONDS, config)])
  } catch { return redirect(config, 'failed', [clear]) }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    if (!url.pathname.startsWith('/auth/') && !url.pathname.startsWith('/api/')) return env.ASSETS.fetch(request)
    let config
    try { config = configuration(env) } catch {
      return json({ configured: false, authenticated: false, error: { message: 'Server sign-in has not been configured.' } }, url.pathname === '/auth/session' ? 200 : 503)
    }
    if (url.origin !== config.origin) return json({}, 403)
    if (url.pathname === '/auth/callback' && request.method === 'GET') return callback(request, env, config)
    try {
      requireSameOrigin(request, config)
      if (url.pathname === '/auth/login' && request.method === 'POST') {
        // Cloudflare supplies this header; it is not trusted for authentication.
        // Hash it before passing it to the approximate, per-location abuse limiter.
        const limit = await env.AUTH_RATE_LIMIT.limit({ key: await digest(request.headers.get('CF-Connecting-IP') || 'local') })
        if (!limit.success) return json({ error: { message: 'Too many sign-in attempts. Please wait a minute.' } }, 429)
        const state = randomSecret()
        const verifier = randomSecret()
        const result = await store(env, state, 'create', { kind: 'oauth', expiresAt: Date.now() + OAUTH_SECONDS * 1000, payload: { verifier } })
        if (!result.ok) return json({}, 503)
        const authorization = new URL('https://accounts.google.com/o/oauth2/v2/auth')
        authorization.search = new URLSearchParams({ client_id: env.GOOGLE_CLIENT_ID, redirect_uri: `${config.origin}/auth/callback`, response_type: 'code', scope: SCOPE, access_type: 'offline', prompt: 'consent select_account', include_granted_scopes: 'false', state, code_challenge: await digest(verifier), code_challenge_method: 'S256' }).toString()
        return json({ url: authorization.href }, 200, { 'Set-Cookie': cookie('oauth', state, OAUTH_SECONDS, config) })
      }
      const session = readCookie(request, 'session', config)
      if (url.pathname === '/auth/logout' && request.method === 'POST') {
        if (session) {
          const destroyed = await store(env, session, 'destroy')
          if (!destroyed.ok) return json({}, 503)
        }
        return json({ authenticated: false }, 200, { 'Set-Cookie': cookie('session', '', 0, config) })
      }
      if (url.pathname === '/auth/session' && request.method === 'GET') {
        if (!session) return json({ configured: true, authenticated: false })
        const response = await store(env, session, 'info')
        if (response.status === 401) return json({ configured: true, authenticated: false }, 200, { 'Set-Cookie': cookie('session', '', 0, config) })
        if (!response.ok) return json({ error: { message: 'Could not check sign-in. Please retry.' } }, 503)
        return json({ configured: true, authenticated: true, ...(await response.json()) })
      }
      if (url.pathname.startsWith('/api/drive/') || url.pathname.startsWith('/api/upload/')) {
        if (!session) return json({ error: { message: 'Please sign in again.' } }, 401)
        const response = await store(env, session, 'access')
        if (!response.ok) return json({ error: { message: response.status === 401 ? 'Please sign in again.' : 'Connection interrupted. Please retry.' } }, response.status)
        const { accessToken } = await response.json()
        // Google can invalidate access before the advertised expiry. Retry one
        // time with a refreshed token; never replay a successful upload.
        const retryRequest = request.clone()
        let proxied
        try { proxied = await proxyDrive(request, accessToken) } catch (error) {
          if (error.status !== 401) throw error
          proxied = json({}, 401)
        }
        if (proxied.status !== 401) return proxied
        const renewed = await store(env, session, 'access', { rejectedAccessToken: accessToken })
        if (!renewed.ok) return json({ error: { message: renewed.status === 401 ? 'Please sign in again.' : 'Connection interrupted. Please retry.' } }, renewed.status)
        return await proxyDrive(retryRequest, (await renewed.json()).accessToken)
      }
      return json({}, 404)
    } catch (error) {
      const status = [400, 401, 403, 413, 502].includes(error.status) ? error.status : error instanceof SyntaxError ? 400 : 503
      return json({ error: { message: status === 503 ? 'Connection interrupted. Please retry.' : 'Request could not be completed.' } }, status)
    }
  },
}
