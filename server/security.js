export const SCOPE = 'https://www.googleapis.com/auth/drive.file'
export const SESSION_SECONDS = 30 * 24 * 60 * 60
export const OAUTH_SECONDS = 600

export function randomSecret() {
  return encode(crypto.getRandomValues(new Uint8Array(32)))
}

function encode(bytes) {
  return btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')
}

function decode(value) {
  return Uint8Array.from(atob(value.replaceAll('-', '+').replaceAll('_', '/')), char => char.charCodeAt(0))
}

export async function digest(value) {
  return encode(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))))
}

async function encryptionKey(secret) {
  const bytes = decode(secret)
  if (bytes.length !== 32) throw new Error('Invalid encryption configuration')
  return crypto.subtle.importKey('raw', bytes, 'AES-GCM', false, ['encrypt', 'decrypt'])
}

export async function seal(value, secret, context) {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: new TextEncoder().encode(context) }, await encryptionKey(secret), new TextEncoder().encode(JSON.stringify(value)))
  // Encode in chunks: plan data is never stored here, but token sizes may vary.
  return { iv: encode(iv), data: encode(new Uint8Array(encrypted)) }
}

export async function unseal(value, secret, context) {
  const bytes = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: decode(value.iv), additionalData: new TextEncoder().encode(context) }, await encryptionKey(secret), decode(value.data))
  return JSON.parse(new TextDecoder().decode(bytes))
}

export function configuration(env) {
  const origin = new URL(env.APP_ORIGIN)
  const local = env.DEV_INSECURE_COOKIES === 'true' && ['localhost', '127.0.0.1'].includes(origin.hostname)
  if (origin.origin !== env.APP_ORIGIN || (origin.protocol !== 'https:' && !local)) throw new Error('Invalid application origin')
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !env.AUTH_ENCRYPTION_KEY || !env.SESSIONS || !env.AUTH_RATE_LIMIT) throw new Error('Missing authentication configuration')
  if (decode(env.AUTH_ENCRYPTION_KEY).length !== 32) throw new Error('Invalid encryption configuration')
  return { origin: origin.origin, local }
}

export function cookieName(kind, config) {
  return `${config.local ? '' : '__Host-'}flowtree_${kind}`
}

export function cookie(kind, value, seconds, config) {
  return `${cookieName(kind, config)}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${seconds}${config.local ? '' : '; Secure'}`
}

export function readCookie(request, kind, config) {
  const name = cookieName(kind, config)
  const matches = (request.headers.get('Cookie') || '').split(';').map(item => item.trim()).filter(item => item.startsWith(`${name}=`))
  if (matches.length !== 1) return null
  const value = matches[0].slice(name.length + 1)
  return /^[A-Za-z0-9_-]{43}$/.test(value) ? value : null
}

export function json(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Vary': 'Cookie', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', ...headers } })
}

export function requireSameOrigin(request, config) {
  if (request.headers.get('X-Flowtree-Request') !== '1') throw Object.assign(new Error('Forbidden'), { status: 403 })
  const site = request.headers.get('Sec-Fetch-Site')
  if (site && !['same-origin', 'none'].includes(site)) throw Object.assign(new Error('Forbidden'), { status: 403 })
  if (request.method !== 'GET' && request.headers.get('Origin') !== config.origin) throw Object.assign(new Error('Forbidden'), { status: 403 })
}

export async function boundedBody(request, limit) {
  if (Number(request.headers.get('Content-Length')) > limit) throw Object.assign(new Error('Too large'), { status: 413 })
  const reader = request.body?.getReader()
  if (!reader) return ''
  let length = 0
  const chunks = []
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      length += value.byteLength
      if (length > limit) { await reader.cancel(); throw Object.assign(new Error('Too large'), { status: 413 }) }
      chunks.push(value)
    }
  } finally { reader.releaseLock() }
  const bytes = new Uint8Array(length)
  let offset = 0
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length }
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
}

export async function googleFetch(url, options = {}) {
  // workerd rejects redirect:'error' before sending the request. Use its
  // supported manual mode and refuse redirects without forwarding credentials.
  const response = await fetch(url, { ...options, redirect: 'manual', signal: AbortSignal.timeout(10_000) })
  if (response.status >= 300 && response.status < 400) {
    await response.body?.cancel()
    throw new Error('Unexpected upstream redirect')
  }
  return response
}

export function validateTokens(tokens, previousRefresh = '') {
  if (typeof tokens.access_token !== 'string' || !tokens.access_token || tokens.access_token.length > 8192 || !/^Bearer$/i.test(tokens.token_type || '') || !Number.isFinite(tokens.expires_in) || tokens.expires_in <= 0 || tokens.expires_in > 86400) throw new Error('Invalid token response')
  const refreshToken = tokens.refresh_token || previousRefresh
  if (typeof refreshToken !== 'string' || !refreshToken || refreshToken.length > 8192) throw new Error('Missing refresh credential')
  if (tokens.scope && !tokens.scope.split(' ').includes(SCOPE)) throw new Error('Missing Drive permission')
  return { accessToken: tokens.access_token, refreshToken, accessExpiresAt: Date.now() + tokens.expires_in * 1000 }
}
