import test from 'node:test'
import assert from 'node:assert/strict'
import { loadRecoveryVersions } from './versionRecovery.js'

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
