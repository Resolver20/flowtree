export const MOBILE_SECTIONS = [
  { id: 'home', label: 'Home', icon: 'home' },
  { id: 'sinking', label: 'Sinking', icon: 'savings' },
  { id: 'loans', label: 'Loans', icon: 'account_balance' },
  { id: 'goals', label: 'Goals', icon: 'flag' },
  { id: 'recurring', label: 'Recurring', icon: 'event_repeat' },
  { id: 'investments', label: 'Investments', icon: 'trending_up' },
  { id: 'ledger', label: 'Ledger', icon: 'receipt_long' },
]
export function sectionAfterSwipe(view, dx, dy) {
  const index = MOBILE_SECTIONS.findIndex(section => section.id === view)
  if (index < 0 || Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy) * 1.5) return view
  return MOBILE_SECTIONS[Math.max(0, Math.min(MOBILE_SECTIONS.length - 1, index + (dx < 0 ? 1 : -1)))].id
}
