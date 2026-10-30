import test from 'node:test'
import assert from 'node:assert/strict'
import { loadCachedRevision, loadRecoveryVersions } from './versionRecovery.js'

test('reopening recovery reuses snapshots and shares downloads already in flight', async () => {
  const cache = new Map()
  let calls = 0
  const load = async () => { calls += 1; return { buffer: 100 } }
  const key = 'file:revision:modified-time'
  const [first, second] = await Promise.all([loadCachedRevision(cache, key, load), loadCachedRevision(cache, key, load)])
  assert.equal(first, second)
  assert.equal(await loadCachedRevision(cache, key, load), first)
  assert.equal(calls, 1)
  await loadCachedRevision(cache, 'file:revision:new-modified-time', load)
  assert.equal(calls, 2)
})

test('recovery retries failed downloads and bounds its in-memory cache', async () => {
  const cache = new Map()
  await assert.rejects(loadCachedRevision(cache, 'failed', async () => { throw new Error('Offline') }))
  assert.equal(cache.has('failed'), false)
  assert.equal(await loadCachedRevision(cache, 'failed', async () => 'restored'), 'restored')
  for (let index = 0; index < 20; index++) await loadCachedRevision(cache, String(index), async () => index)
  assert.equal(cache.size, 12)
})

test('five recovery versions need only six downloads, including the comparison baseline', async () => {
  const revisions = Array.from({ length: 100 }, (_, id) => ({ id }))
  const loaded = []
  const versions = await loadRecoveryVersions(revisions, async revision => {
    loaded.push(revision.id)
    return { buffer: revision.id }
  })
  assert.equal(versions.length, 5)
  assert.deepEqual(loaded, [0, 1, 2, 3, 4, 5])
  assert.deepEqual(versions[4].changes, ['Modified: Safety buffer'])
})

test('unreadable revisions are skipped while preserving newest-first order', async () => {
  const revisions = Array.from({ length: 10 }, (_, id) => ({ id }))
  const versions = await loadRecoveryVersions(revisions, async ({ id }) => {
    if (id < 2) throw new Error('Unavailable')
    return { buffer: id }
  })
  assert.deepEqual(versions.map(item => item.id), [2, 3, 4, 5, 6])
  assert.deepEqual(await loadRecoveryVersions([], async () => ({})), [])
})
