import test from 'node:test'
import assert from 'node:assert/strict'
import { driveRestoreMode, orderDriveRestoreCandidates, orderValidDriveRestoreCandidates } from './driveRestoreCandidates.js'

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

test('only valid gpt candidates are offered, newest first', () => {
  const candidates = orderValidDriveRestoreCandidates([
    { id: 'invalid-newer', name: 'flowtree-plan.json', folderName: 'gpt', modifiedTime: '2026-10-04T08:00:00.000Z', valid: false },
    { id: 'valid-older', name: 'my-plan-export.json', folderName: 'gpt', modifiedTime: '2026-10-01T08:00:00.000Z', valid: true },
    { id: 'valid-newer', name: 'flowtree-plan.json', folderName: 'gpt', modifiedTime: '2026-10-03T08:00:00.000Z', valid: true },
    { id: 'legacy-flowtree', name: 'flowtree-plan.json', folderName: 'FlowTree', modifiedTime: '2026-10-05T08:00:00.000Z', valid: true },
  ], 'gpt')

  assert.deepEqual(candidates.map(candidate => candidate.id), ['valid-newer', 'valid-older'])
  assert.equal(driveRestoreMode(candidates), 'choose')
})
