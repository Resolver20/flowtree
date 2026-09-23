import test from 'node:test'
import assert from 'node:assert/strict'
import { allocateEnergy, energyAtPath } from './energyFlow.js'
const node = (id, amount, children = []) => ({ id, amount, period: 'month', status: 'active', children })
test('priority fills targets without creating money or funding later nodes early', () => {
  const flow = allocateEnergy([node('bills', 4000), node('insurance', 1000), node('subscriptions', 2000)], 4500)
  assert.deepEqual(flow.allocations.map(item => item.allocated), [4000, 500, 0])
  assert.equal(flow.remaining, 0)
})
test('child preview uses parent share after own allocation, rather than full income', () => {
  const flow = allocateEnergy([node('parent', 100, [node('first', 400), node('second', 300)])], 550)
  assert.equal(energyAtPath(flow.allocations, ['parent', 'second']).allocated, 50)
  assert.equal(flow.allocations[0].allocated, 550)
})
test('zero targets and inactive nodes do not consume flow; surplus stays available', () => {
  const flow = allocateEnergy([node('empty', 0), { ...node('inactive', 800), status: 'dormant' }, node('bill', 200)], 500)
  assert.deepEqual(flow.allocations.map(item => item.allocated), [0, 0, 200])
  assert.equal(flow.remaining, 300)
  assert.equal(allocateEnergy([node('bill', 200)], -20).allocations[0].allocated, 0)
})
