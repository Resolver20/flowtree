import test from 'node:test'
import assert from 'node:assert/strict'
import { goalTargetDate } from '../../src/domain/goalDates.js'

test('each year shortcut advances the selected date again, preserving its day and month', () => {
  let date = '2028-10-31'
  date = goalTargetDate(date, 1)
  assert.equal(date, '2029-10-31')
  date = goalTargetDate(date, 1)
  assert.equal(date, '2030-10-31')
  assert.equal(goalTargetDate('2035-04-15', 1), '2036-04-15')
})

test('advancing leap day clamps to February rather than moving into March', () => {
  assert.equal(goalTargetDate('2028-02-29', 1), '2029-02-28')
  assert.equal(goalTargetDate('2029-02-28', 1), '2030-02-28')
})
