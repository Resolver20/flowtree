import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { convertV4MiniflareOptions, Miniflare } from 'miniflare'

test('Google fetch constructs supported requests in real workerd and refuses redirects', async t => {
  // Only fetch is mocked; Request and AbortSignal are real Cloudflare runtime
  // implementations. No Google credentials or outbound requests are involved.
  const runtime = new Miniflare(convertV4MiniflareOptions({
    compatibilityDate: '2026-10-30',
    modules: [
      { type: 'ESModule', path: 'runtime-worker.mjs', contents: `
import { googleFetch } from './runtime-security.mjs';
export default { async fetch(request) {
  let calls=0, redirectMode='';
  globalThis.fetch=async (url, options)=>{
    calls++;
    const upstream=new Request(url,options);
    redirectMode=upstream.redirect;
    return new Response('',{status:new URL(request.url).pathname==='/redirect'?302:200,headers:{Location:'https://untrusted.invalid/'}});
  };
  try {
    const response=await googleFetch('https://example.invalid/token',{method:'POST',body:'synthetic-only'});
    return Response.json({status:response.status,calls,redirectMode});
  } catch(error) {
    return Response.json({blocked:error.message==='Unexpected upstream redirect',calls,redirectMode},{status:502});
  }
}};` },
      { type: 'ESModule', path: 'runtime-security.mjs', contents: readFileSync(new URL('../../server/security.js', import.meta.url), 'utf8') },
    ],
  }))
  t.after(() => runtime.dispose())
  const ok = await runtime.dispatchFetch('http://runtime.test/ok')
  assert.equal(ok.status, 200)
  assert.deepEqual(await ok.json(), { status: 200, calls: 1, redirectMode: 'manual' })
  const redirect = await runtime.dispatchFetch('http://runtime.test/redirect')
  assert.equal(redirect.status, 502)
  assert.deepEqual(await redirect.json(), { blocked: true, calls: 1, redirectMode: 'manual' })
})
