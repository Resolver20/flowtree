export function pagesMigrationFiles(target, verificationTag = '') {
  const url = new URL(target)
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.pathname !== '/') throw new Error('Use the HTTPS origin of the verified Flowtree host.')
  const origin = url.origin
  // No automatic redirect: an existing installation should clearly explain the
  // host change and give the user an explicit action to open the new location.
  return {
    html: `<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">${verificationTag}<title>Flowtree has moved</title><link rel="canonical" href="${origin}/"><style>*{box-sizing:border-box}body{margin:0;background:#f7f8fa;color:#252a34;font:16px/1.6 system-ui,sans-serif;padding:calc(32px + env(safe-area-inset-top)) max(20px,env(safe-area-inset-left)) calc(32px + env(safe-area-inset-bottom))}main{max-width:480px;margin:8vh auto;padding:28px;background:#fff;border:1px solid #dde1ea;border-radius:20px}h1{font-size:26px;line-height:1.2}a{display:inline-block;background:#535fd0;color:#fff;padding:12px 20px;border-radius:12px;text-decoration:none}a:focus-visible{outline:3px solid #252a34;outline-offset:4px}small{display:block;margin-top:20px;overflow-wrap:anywhere}</style></head><body><main><h1>Flowtree has moved</h1><p>Open Flowtree at its new address. Your saved plan stays in your Google Drive.</p><p>Sign in at the new site. If you installed the old app, add the new site to your Home Screen.</p><a href="${origin}/">Open Flowtree</a><small>${origin}</small></main><script>if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});</script></body></html>`,
    worker: `const CACHE='flowtree-host-migration-v1';
const SHELL=new URL('./index.html',self.location.href).href;
self.addEventListener('install',event=>event.waitUntil((async()=>{const response=await fetch(SHELL,{cache:'reload'});if(!response.ok)throw Error('Migration page unavailable');const cache=await caches.open(CACHE);await cache.put(SHELL,response);})()));
// Do not skipWaiting: an open plan may contain unsaved edits.
self.addEventListener('activate',event=>event.waitUntil((async()=>{const prefix='flowtree-shell-'+encodeURIComponent(new URL('./',self.location.href).pathname)+'-';for(const key of await caches.keys())if(key.startsWith(prefix))await caches.delete(key);await self.clients.claim();})()));
self.addEventListener('fetch',event=>{const url=new URL(event.request.url);if(event.request.method!=='GET'||event.request.mode!=='navigate'||url.origin!==self.location.origin||![new URL('./',self.location.href).pathname,new URL(SHELL).pathname].includes(url.pathname))return;event.respondWith((async()=>{const cache=await caches.open(CACHE);return await cache.match(SHELL)||fetch(event.request);})());});`,
  }
}
