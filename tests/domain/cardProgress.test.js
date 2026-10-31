import test from 'node:test'
import assert from 'node:assert/strict'
import { cardProgress } from '../../src/domain/cardProgress.js'
const today = new Date(2026, 0, 1)
const annual = (amount, savedAmount) => ({ period: 'year', amount, savedAmount, children: [] })
test('group cards combine yearly targets without averaging or double counting', () => {
 const node = { ...annual(100, 25), children: [annual(300, 175)] }
 assert.equal(cardProgress(node, {}, today).ratio, .5)
 assert.equal(cardProgress({children:[node]}, {}, today).ratio, .5)
})
test('all cards have bounded progress including zero targets and monthly allocation', () => {
 assert.equal(cardProgress(annual(0, 0), {}, today).ratio, 0)
 assert.equal(cardProgress(annual(100, 150), {}, today).ratio, 1)
 assert.equal(cardProgress({}, {target:100, allocated:30}, today).ratio, .3)
 assert.equal(cardProgress({}, {}, today).ratio, 0)
 assert.equal(cardProgress({}, {target:100,allocated:150},today).ratio,1)
})
