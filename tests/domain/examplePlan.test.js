import test from 'node:test'
import assert from 'node:assert/strict'
import { createExamplePlan, resolveDriveSetupPlan } from '../../src/domain/examplePlan.js'
import { findNode, totalChildren } from '../../src/domain/flowTree.js'
import { parseFlowImport, serializeFlowData } from '../../src/domain/flowDataTransfer.js'

test('beginner example has a clear salary, familiar expenses and money left after its buffer', () => {
  const today = new Date(2026, 9, 31)
  const plan = createExamplePlan(today)
  const income = plan.incomeSources.reduce((sum, source) => sum + source.amount, 0)
  assert.equal(income, 50000)
  assert.equal(findNode(plan.tree, 'example-rent').amount, 12000)
  assert.equal(findNode(plan.tree, 'example-groceries').amount, 6000)
  assert.equal(totalChildren(plan.tree, today), 33000)
  assert.equal(income - plan.buffer - totalChildren(plan.tree, today), 15000)
  assert.equal(findNode(plan.tree, 'example-holiday').dueDate, '2027-09-30')
  assert.equal(parseFlowImport(serializeFlowData(plan)).incomeSources[0].amount, 50000)
})

test('examples are disposable and always have valid twelve-month target dates', () => {
  const first = createExamplePlan(new Date(2026, 9, 31))
  first.tree[0].children[0].name = 'Changed example'
  assert.notEqual(createExamplePlan(new Date(2026, 9, 31)).tree[0].children[0].name, 'Changed example')
  assert.equal(findNode(createExamplePlan(new Date(2027, 2, 31)).tree, 'example-holiday').dueDate, '2028-02-29')
})

test('new account setup cannot copy the example even when use-current-plan is requested', () => {
  const currentPlan = createExamplePlan()
  const blankPlan = { incomeSources: [], tree: [], buffer: 0 }
  for (const useCurrentPlan of [true, false]) {
    const setup = resolveDriveSetupPlan({ currentPlan, blankPlan, useCurrentPlan, isExample: true })
    assert.equal(setup.plan, blankPlan)
    assert.equal(setup.usesCurrentPlan, false)
  }
  const personal = resolveDriveSetupPlan({ currentPlan, blankPlan, useCurrentPlan: true, isExample: false })
  assert.equal(personal.plan, currentPlan)
  assert.equal(personal.usesCurrentPlan, true)
  assert.equal(resolveDriveSetupPlan({ currentPlan, blankPlan, useCurrentPlan: false, isExample: false }).plan, blankPlan)
})
