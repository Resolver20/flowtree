import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'

export function serviceWorkerSource({ base, assets, version }) {
  return `const CACHE_PREFIX = 'flowtree-shell-' + ${JSON.stringify(encodeURIComponent(base) + '-')};
const CACHE = CACHE_PREFIX + ${JSON.stringify(version)};
const ASSETS = ${JSON.stringify(assets)};
const SHELL = ${JSON.stringify(base + 'index.html')};
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)));
});
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
  event.respondWith(caches.open(CACHE).then(cache => cache.match(navigation ? SHELL : url.pathname)).then(cached => cached || fetch(request)));
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
      for (const file of files) hash.update(readFileSync(new URL(`../public/${file}`, import.meta.url)))
      const outputFiles = Object.keys(bundle).filter(name => !name.endsWith('.map'))
      for (const name of outputFiles) hash.update(bundle[name].code || bundle[name].source)
      const assets = [...new Set([...outputFiles, 'index.html', ...files].map(name => base + name))]
      this.emitFile({ type: 'asset', fileName: 'sw.js', source: serviceWorkerSource({ base, assets, version: hash.digest('hex').slice(0, 16) }) })
    },
  }
}
