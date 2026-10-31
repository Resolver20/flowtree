export const serverAuthEnabled = import.meta.env?.VITE_AUTH_MODE === 'server'
// A transport marker, never a Google token or a session credential.
export const SERVER_SESSION = 'flowtree-cookie-transport'

export async function serverAuthRequest(path, method = 'GET') {
  const response = await fetch(path, { method, credentials: 'same-origin', cache: 'no-store', headers: { 'X-Flowtree-Request': '1' } })
  const body = await response.json()
  if (!response.ok) throw Object.assign(new Error(body.error?.message || 'Could not connect. Please retry.'), { status: response.status })
  return body
}

export async function beginServerSignIn() {
  const { url } = await serverAuthRequest('/auth/login', 'POST')
  const destination = new URL(url)
  if (destination.origin !== 'https://accounts.google.com' || destination.pathname !== '/o/oauth2/v2/auth') throw new Error('Invalid sign-in destination.')
  window.location.assign(destination.href)
}

export function authorizedDriveFetch(base, path, accessToken, options = {}) {
  if (accessToken === SERVER_SESSION) {
    const prefix = base === 'https://www.googleapis.com/upload/drive/v3' ? '/api/upload' : '/api/drive'
    const headers = new Headers(options.headers)
    headers.delete('Authorization')
    headers.set('X-Flowtree-Request', '1')
    return fetch(`${prefix}${path}`, { ...options, headers, credentials: 'same-origin', cache: 'no-store' })
  }
  return fetch(`${base}${path}`, { ...options, headers: { ...options.headers, Authorization: `Bearer ${accessToken}` } })
}
