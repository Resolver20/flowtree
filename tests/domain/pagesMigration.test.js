import test from 'node:test'
import assert from 'node:assert/strict'
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
