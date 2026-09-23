export function formatMoney(value) {
  return `₹${Math.round(Number(value) || 0).toLocaleString('en-IN')}`
}

export function formatDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || '')
  if (!match) return 'Not set'
  const [, year, month, day] = match.map(Number)
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(year, month - 1, day))
}
