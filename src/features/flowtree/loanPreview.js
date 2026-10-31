export function shouldShowLoanPreview(target, { selected, editingId, adding }) {
  if (!selected?.loan || editingId || adding) return false
  // The list stretches to the details height: its empty space is outside a card.
  return !target.closest('.loan-details, .loan-editor, button, input, select, textarea, a')
}
