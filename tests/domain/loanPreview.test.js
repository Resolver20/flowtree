import test from 'node:test'
import assert from 'node:assert/strict'
import { shouldShowLoanPreview } from '../../src/features/flowtree/loanPreview.js'

const viewing = { selected: { id: 'home-loan', loan: { principal: 8000000 } }, editingId: null, adding: false }
// Model the target and its ancestors, including the stretched list container.
const target = (...ancestors) => ({ closest: selectors => ancestors.find(ancestor => selectors.split(', ').includes(ancestor)) || null })

test('empty space below a loan card and between loan cards returns to preview', () => {
  assert.equal(shouldShowLoanPreview(target('.loan-list', '.loan-workspace'), viewing), true)
  assert.equal(shouldShowLoanPreview(target('.loans-view'), viewing), true)
})

test('details, loan buttons, and other interactive controls keep the current view', () => {
  for (const ancestor of ['.loan-details', '.loan-editor', 'button', 'input', 'select', 'textarea', 'a']) {
    assert.equal(shouldShowLoanPreview(target('span', ancestor, '.loan-list'), viewing), false, ancestor)
  }
})

test('outside clicks preserve drafts and do nothing when no configured loan is selected', () => {
  for (const changes of [{ editingId: 'home-loan' }, { adding: true }, { selected: null }, { selected: { id: 'new-loan' } }]) {
    assert.equal(shouldShowLoanPreview(target('.loan-list'), { ...viewing, ...changes }), false)
  }
})
