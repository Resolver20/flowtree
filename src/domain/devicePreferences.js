// Persist preferences, never OAuth tokens or plan contents.
function get(host, kind, key) {
  try { return host[kind].getItem(key) } catch { return null }
}
function set(host, kind, key, value) {
  try { host[kind].setItem(key, value) } catch { /* Optional storage. */ }
}
export function readDeviceTheme(host) {
  const saved = get(host, 'localStorage', 'flowtree-theme')
  if (saved === 'dark' || saved === 'light') return saved
  return get(host, 'sessionStorage', 'flowtree-theme') === 'dark' ? 'dark' : 'light'
}
export function writeDeviceTheme(host, theme) {
  set(host, 'localStorage', 'flowtree-theme', theme)
  set(host, 'sessionStorage', 'flowtree-theme', theme)
}
export function rememberedGoogleAccount(host) {
  return get(host, 'localStorage', 'flowtree-google-account') || ''
}
export function rememberGoogleAccount(host, email) {
  if (typeof email === 'string' && email.includes('@')) set(host, 'localStorage', 'flowtree-google-account', email)
}
export function forgetGoogleAccount(host) {
  try { host.localStorage.removeItem('flowtree-google-account') } catch { /* Optional storage. */ }
}
export function googleReconnectOptions(host, prompt) {
  const loginHint = rememberedGoogleAccount(host)
  return prompt === undefined
    ? { prompt: loginHint ? '' : 'select_account consent', ...(loginHint ? { loginHint } : {}) }
    : { prompt }
}
