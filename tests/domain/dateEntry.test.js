import test from 'node:test'
import assert from 'node:assert/strict'
import { dateEntryError, displayDateInput, formatDateTyping, parseDateInput } from '../../src/domain/dateEntry.js'

test('typed dates round-trip without timezone conversion', () => {
  assert.equal(displayDateInput('2027-12-31'), '31/12/2027')
  assert.equal(parseDateInput('31/12/2027'), '2027-12-31')
  assert.equal(displayDateInput(''), '')
  assert.equal(parseDateInput(''), '')
})
test('calendar dates reject rollover and respect leap years', () => {
  for (const text of ['31/04/2027','29/02/2027','00/01/2027','01/13/2027','01/01/0000','1/1/2027']) assert.equal(parseDateInput(text), '')
  assert.equal(parseDateInput('29/02/2028'), '2028-02-29')
})
test('numeric keyboards can enter a full date without slash keys', () => {
  let text = ''
  for (const digit of '31122027') text = formatDateTyping(text + digit)
  assert.equal(text, '31/12/2027')
  assert.equal(formatDateTyping('01012026'), '01/01/2026')
  assert.equal(formatDateTyping('bad date'), 'bad date')
})
test('date validation prevents stale or out-of-range values from saving', () => {
  assert.match(dateEntryError('31/04/2027'), /valid date/)
  assert.match(dateEntryError('01/01/2026', {min:'2026-10-31'}), /on or after/)
  assert.match(dateEntryError('01/01/2028', {max:'2027-12-31'}), /on or before/)
  assert.equal(dateEntryError('31/12/2027', {min:'2027-12-31',max:'2027-12-31'}), '')
})
