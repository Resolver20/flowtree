import test from 'node:test'
import assert from 'node:assert/strict'
import { restoreDriveSession } from './restoreDriveSession.js'

test('a slow profile request does not block the saved plan', async () => {
  let resolveProfile
  const profile = new Promise(resolve => { resolveProfile = resolve })
  let receivedUser
  const plan = await restoreDriveSession({}, {
    loadPlan: async () => ({ tree: ['saved plan'] }),
    loadUser: () => profile,
    onUser: user => { receivedUser = user },
  })
  assert.deepEqual(plan.tree, ['saved plan'])
  assert.equal(receivedUser, undefined)
  resolveProfile({ displayName: 'Test' })
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(receivedUser.displayName, 'Test')
})

test('cached account details skip the profile request on refresh', async () => {
  let calls = 0
  const plan = await restoreDriveSession({ user: { displayName: 'Test' } }, {
    loadPlan: async () => 'plan',
    loadUser: async () => { calls += 1 },
    onUser: () => {},
  })
  assert.equal(plan, 'plan')
  assert.equal(calls, 0)
})

test('profile failures do not discard the plan; plan failures still surface', async () => {
  const dependencies = { loadUser: async () => { throw new Error('Profile unavailable') }, onUser: () => {} }
  assert.equal(await restoreDriveSession({}, { ...dependencies, loadPlan: async () => 'plan' }), 'plan')
  await assert.rejects(restoreDriveSession({}, { ...dependencies, loadPlan: async () => { throw new Error('Plan unavailable') } }), /Plan unavailable/)
})
