export function shouldShowLedgerOverview(target, { selected, editingId, creating }) {
  if (!selected || editingId || creating) return false
  return !target.closest('.ledger-details, .ledger-editor, button, input, select, textarea, a')
}
