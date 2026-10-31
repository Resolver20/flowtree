import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { pagesMigrationFiles } from '../../build/pagesMigration.js'

test('Pages migration preserves verification and offers an explicit new-host link', () => {
  const tag = '<meta name="google-site-verification" content="test">'
  const { html, worker } = pagesMigrationFiles('https://flowtree.example', tag)
  assert.ok(html.includes(tag))
  assert.ok(html.includes('<a href="https://flowtree.example/">Open Flowtree</a>'))
  assert.ok(!html.includes('http-equiv="refresh"'))
  assert.ok(!worker.includes('self.skipWaiting('))
  assert.ok(worker.includes("key.startsWith(prefix)"))
  assert.ok(worker.includes("event.request.mode!=='navigate'"))
})

test('Pages migration rejects insecure URLs, credentials, paths and query injection', () => {
  for (const target of ['http://example.com', 'https://user:pass@example.com', 'https://example.com/path', 'https://example.com/?x=1', 'https://example.com/#x']) assert.throws(() => pagesMigrationFiles(target))
})

test('Pages migration build preserves existing legal pages and site verification', (t) => {
  const cwd = mkdtempSync(join(tmpdir(), 'flowtree-migration-'))
  t.after(() => rmSync(cwd, { recursive: true, force: true }))
  mkdirSync(join(cwd, 'public'))
  writeFileSync(join(cwd, 'index.html'), '<meta name="google-site-verification" content="test">')
  for (const file of ['privacy.html', 'terms.html']) writeFileSync(join(cwd, 'public', file), `Existing ${file}`)
  const result = spawnSync(process.execPath, [fileURLToPath(new URL('../../scripts/build-pages-migration.mjs', import.meta.url))], {
    cwd, env: { ...process.env, FLOWTREE_HOST_URL: 'https://flowtree.example' }, encoding: 'utf8',
  })
  assert.equal(result.status, 0, result.stderr)
  for (const file of ['privacy.html', 'terms.html']) assert.equal(readFileSync(join(cwd, 'dist', file), 'utf8'), `Existing ${file}`)
  assert.ok(readFileSync(join(cwd, 'dist', 'index.html'), 'utf8').includes('google-site-verification'))
})
