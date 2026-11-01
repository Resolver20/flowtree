export function cardStartDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function cardStartMode(startDate, today = cardStartDate()) {
  return startDate && startDate !== today ? 'existing' : 'fresh'
}

export function yearBeforeTarget(dueDate) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate || '')) return ''
  const [year, month, day] = dueDate.split('-').map(Number)
  if (year < 2 || month < 1 || month > 12 || day < 1 || day > new Date(year, month, 0).getDate()) return ''
  return `${String(year - 1).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(Math.min(day, new Date(year - 1, month, 0).getDate())).padStart(2, '0')}`
}
