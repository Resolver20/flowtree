import test from 'node:test'
import assert from 'node:assert/strict'
import { monthlyPlanShare } from '../../src/domain/monthlyPlanShare.js'
import { totalChildren } from '../../src/domain/flowTree.js'
import { allocateEnergy } from '../../src/domain/energyFlow.js'

const tree = [
  { id:'needs', amount:100, period:'month', children:[{id:'bill',amount:900,period:'month',children:[]},{id:'annual',amount:12000,period:'year',children:[]}] },
  { id:'other', amount:1000, period:'month', children:[] },
]

test('card shares use total monthly income, not planned targets or funded allocation', () => {
  const planned = totalChildren(tree)
  assert.equal(planned, 3000)
  const funding = allocateEnergy(tree, 100).allocations
  const parent = monthlyPlanShare({ tree, path:['needs'], amount:funding[0].target, income:6000 })
  assert.equal(parent.label, '33.3%')
  assert.equal(monthlyPlanShare({ tree, path:['needs','bill'], amount:900, income:6000 }).label, '15%')
  assert.equal(monthlyPlanShare({ tree, path:['needs','annual'], amount:1000, income:6000 }).label, '16.7%')
  assert.equal(Math.round(parent.percentage + monthlyPlanShare({ tree, path:['other'], amount:1000, income:6000 }).percentage), 50)
})

test('inactive records and descendants of inactive parents contribute zero', () => {
  const paused = [{ id:'paused', status:'inactive', children:[{id:'child',status:'active',children:[]}] }]
  assert.equal(monthlyPlanShare({ tree:paused, path:['paused'], amount:500, income:1000 }).label, '0%')
  assert.equal(monthlyPlanShare({ tree:paused, path:['paused','child'], amount:500, income:1000 }).label, '0%')
})

test('zero income, tiny shares and missing paths have readable labels', () => {
  assert.equal(monthlyPlanShare({ tree, path:['other'], amount:1000, income:0 }).label, '0%')
  assert.equal(monthlyPlanShare({ tree, path:['other'], amount:1, income:100000 }).label, '<0.1%')
  assert.equal(monthlyPlanShare({ tree, path:['missing'], amount:1000, income:3000 }).label, '0%')
})

test('filtered sinking targets retain the monthly-income denominator', () => {
  assert.equal(monthlyPlanShare({ tree, path:['needs'], amount:1000, income:3000 }).label, '33.3%')
})


test('house loan is 31.7 percent of salary and can exceed 100 percent when over budget', () => {
  assert.equal(monthlyPlanShare({ tree, path:['other'], amount:20000, income:63000 }).label, '31.7%')
  assert.equal(monthlyPlanShare({ tree, path:['other'], amount:20000, income:10000 }).label, '200%')
})
