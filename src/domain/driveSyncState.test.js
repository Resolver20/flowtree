import test from 'node:test'
import assert from 'node:assert/strict'
import { canAutosaveDrive } from './driveSyncState.js'

const session = { accessToken: 'token', folderId: 'folder', fileId: 'file' }

test('Drive autosave waits for restore or an explicit plan setup decision', () => {
  assert.equal(canAutosaveDrive({ ...session, status: 'restoring' }), false)
  assert.equal(canAutosaveDrive({ ...session, status: 'needs-plan-choice' }), false)
  assert.equal(canAutosaveDrive({ ...session, status: 'connected' }), true)
  assert.equal(canAutosaveDrive({ ...session, status: 'saved' }), true)
  assert.equal(canAutosaveDrive({ ...session, status: 'error' }), true)
  assert.equal(canAutosaveDrive({ status: 'connected', accessToken: 'token', folderId: 'folder', fileId: '' }), false)
})
