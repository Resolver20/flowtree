import { googleFetch, json, seal, unseal, validateTokens } from './security.js'

// Only the Worker binding can reach this object. No public route exposes it.
// Serializing requests also prevents concurrent refreshes and logout resurrection.
export class SessionStore {
  constructor(ctx, env) {
    this.ctx = ctx
    this.env = env
    this.pending = Promise.resolve()
  }

  exclusive(operation) {
    const result = this.pending.then(operation)
    this.pending = result.catch(() => {})
    return result
  }

  context() { return `flowtree-session-v1:${this.ctx.id.toString()}` }

  async save(record) {
    await this.ctx.storage.put('record', await seal(record, this.env.AUTH_ENCRYPTION_KEY, this.context()))
    await this.ctx.storage.setAlarm(record.expiresAt)
  }

  async remove() {
    await this.ctx.storage.deleteAll()
    await this.ctx.storage.deleteAlarm()
  }

  fetch(request) {
    return this.exclusive(async () => {
      try {
        const action = new URL(request.url).pathname
        if (request.method !== 'POST') return json({}, 405)
        if (action === '/destroy') { await this.remove(); return json({}) }
        const encrypted = await this.ctx.storage.get('record')
        if (action === '/create') {
          if (encrypted) return json({}, 409)
          await this.save(await request.json())
          return json({})
        }
        if (!encrypted) return json({}, 401)
        const record = await unseal(encrypted, this.env.AUTH_ENCRYPTION_KEY, this.context())
        if (record.expiresAt <= Date.now()) { await this.remove(); return json({}, 401) }
        if (action === '/take' && record.kind === 'oauth') {
          await this.remove()
          return json(record.payload)
        }
        if (record.kind !== 'session') return json({}, 401)
        if (action === '/info') return json({ user: record.payload.user })
        if (action !== '/access') return json({}, 404)
        const rejected = request.body ? (await request.json()).rejectedAccessToken : null
        if (record.payload.accessExpiresAt <= Date.now() + 60_000 || (rejected && rejected === record.payload.accessToken)) {
          const response = await googleFetch('https://oauth2.googleapis.com/token', {
            method: 'POST', body: new URLSearchParams({ client_id: this.env.GOOGLE_CLIENT_ID, client_secret: this.env.GOOGLE_CLIENT_SECRET, refresh_token: record.payload.refreshToken, grant_type: 'refresh_token' }),
          })
          const tokens = await response.json()
          if (!response.ok) {
            if (tokens.error === 'invalid_grant') { await this.remove(); return json({}, 401) }
            return json({}, 503)
          }
          record.payload = { ...record.payload, ...validateTokens(tokens, record.payload.refreshToken) }
          await this.save(record)
        }
        return json({ accessToken: record.payload.accessToken })
      } catch { return json({}, 503) }
    })
  }

  alarm() { return this.exclusive(() => this.remove()) }
}
