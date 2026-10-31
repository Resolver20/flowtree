import test from 'node:test'
import assert from 'node:assert/strict'
import { FINANCE_ICON_OPTIONS, findFinanceIcon } from '../../src/features/flowtree/financeIcons.js'

test('shared icon suggestions are one alphabetical list with unique labels', () => {
  const alphabetically = labels => [...labels].sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' }))
  const labels = FINANCE_ICON_OPTIONS.map(([, label]) => label)
  assert.deepEqual(labels, alphabetically(labels))
  assert.equal(new Set(labels).size, labels.length)
  for (const [value, label] of FINANCE_ICON_OPTIONS) assert.equal(findFinanceIcon(label), value)
})

test('typed icon labels match regardless of case and whitespace without saving partial search text', () => {
  assert.equal(findFinanceIcon('  bAnK  '), 'account_balance')
  assert.equal(findFinanceIcon('Car insurance'), 'directions_car')
  assert.equal(findFinanceIcon('car ins'), undefined)
  assert.equal(findFinanceIcon(''), undefined)
  assert.equal(findFinanceIcon('nonexistent icon'), undefined)
})
