import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'

export function serviceWorkerSource({ base, assets, version }) {
  return `const CACHE_PREFIX = 'flowtree-shell-' + ${JSON.stringify(encodeURIComponent(base) + '-')};
const CACHE = CACHE_PREFIX + ${JSON.stringify(version)};
const ASSETS = ${JSON.stringify(assets)};
const SHELL = ${JSON.stringify(base + 'index.html')};
function navigationResponse(response) {
  // Hosts such as Workers redirect index.html to /. A followed redirect cannot
  // be returned for a navigation whose redirect mode is manual (ERR_FAILED).
  // Reconstruct only our static shell response, preserving its body and headers.
  return response.redirected ? new Response(response.body, { status: response.status, statusText: response.statusText, headers: response.headers }) : response;
}
async function installShell() {
  // Bypass the HTTP cache: a deployment must not pair stale HTML with new assets.
  const responses = await Promise.all(ASSETS.map(path => fetch(new Request(path, { cache: 'reload' }))));
  if (responses.some(response => !response.ok)) throw new Error('Incomplete app release');
  const html = await responses[ASSETS.indexOf(SHELL)].clone().text();
  const codeAssets = ASSETS.filter(path => /[.](js|css)$/.test(path));
  if (!codeAssets.every(path => html.includes(path))) throw new Error('App shell release mismatch');
  const cache = await caches.open(CACHE);
  await Promise.all(ASSETS.map((path, index) => cache.put(path, path === SHELL ? navigationResponse(responses[index]) : responses[index])));
}
self.addEventListener('install', event => { event.waitUntil(installShell()); });
// Wait for all existing windows to close before activating an update.
// Never reload a window that may contain an unsaved plan.
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || request.headers.has('Authorization')) return;
  const navigation = request.mode === 'navigate' && (url.pathname === ${JSON.stringify(base)} || url.pathname === SHELL);
  if (!navigation && (url.search || !ASSETS.includes(url.pathname))) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(navigation ? SHELL : url.pathname);
    if (!navigation) return cached || fetch(request);
    // Storage eviction must not leave cached HTML pointing at missing old bundles.
    const complete = cached && (await Promise.all(ASSETS.filter(path => /[.](js|css)$/.test(path)).map(path => cache.match(path)))).every(Boolean);
    if (complete) return navigationResponse(cached);
    try {
      const response = await fetch(new Request(request, { cache: 'reload' }));
      if (response.ok) return navigationResponse(response);
    } catch { /* Fall through to an offline recovery page. */ }
    return new Response('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>Flowtree</title><main style="font:16px system-ui;padding:32px;max-width:480px;margin:auto"><h1>Flowtree needs to reconnect</h1><p>The app files are unavailable. Connect to the internet and try again. Your saved plan has not been cleared.</p><a href="' + SHELL + '">Try again</a></main>', { headers: { 'Content-Type': 'text/html; charset=utf-8' }, status: 503 });
  })());
});
`
}

export function flowtreePwa() {
  let base
  return {
    name: 'flowtree-pwa',
    apply: 'build',
    configResolved(config) { base = config.base },
    generateBundle(_options, bundle) {
      const files = ['manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/maskable-512.png', 'icons/apple-touch-icon.png', 'favicon.svg']
      const hash = createHash('sha256')
      hash.update(serviceWorkerSource.toString())
      for (const file of files) hash.update(readFileSync(new URL(`../public/${file}`, import.meta.url)))
      const outputFiles = Object.keys(bundle).filter(name => !name.endsWith('.map'))
      for (const name of outputFiles) hash.update(bundle[name].code || bundle[name].source)
      const assets = [...new Set([...outputFiles, 'index.html', ...files].map(name => base + name))]
      this.emitFile({ type: 'asset', fileName: 'sw.js', source: serviceWorkerSource({ base, assets, version: hash.digest('hex').slice(0, 16) }) })
    },
  }
}
