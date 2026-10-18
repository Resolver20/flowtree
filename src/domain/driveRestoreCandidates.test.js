import test from 'node:test'
import assert from 'node:assert/strict'
import { driveRestoreMode, orderDriveRestoreCandidates } from './driveRestoreCandidates.js'

test('Drive restore candidates are newest first and require a choice for duplicates', () => {
  const candidates = orderDriveRestoreCandidates([
    { id: 'older', name: 'flowtree-plan.json', modifiedTime: '2026-10-01T08:00:00.000Z' },
    { id: 'newer', name: 'flowtree-plan.json', modifiedTime: '2026-10-03T08:00:00.000Z' },
  ])
  assert.deepEqual(candidates.map(candidate => candidate.id), ['newer', 'older'])
  assert.equal(driveRestoreMode([]), 'setup')
  assert.equal(driveRestoreMode([candidates[0]]), 'restore')
  assert.equal(driveRestoreMode(candidates), 'choose')
})
