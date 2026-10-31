function monthIndex(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || '')
  if (!match) return null
  const [, year, month, day] = match.map(Number)
  const date = new Date(year, month - 1, day)
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? year * 12 + month - 1 : null
}

// Progress describes contributions planned before this month; this month's
// contribution remains in the outstanding amount and monthly allocation.
export function goalSavingsPlan(node, today = new Date()) {
  const currentMonth = today.getFullYear() * 12 + today.getMonth()
  const startMonth = monthIndex(node.startDate) ?? currentMonth
  const endMonth = monthIndex(node.dueDate)
  const target = Math.max(0, Number(node.amount) || 0)
  const recordedSaved = Math.min(target, Math.max(0, Number(node.savedAmount) || 0))
  const totalMonths = Math.max(1, (endMonth ?? startMonth + 11) - startMonth + 1)
  const completedMonths = Math.max(0, Math.min(totalMonths, currentMonth - startMonth))
  const plannedSaved = target * completedMonths / totalMonths
  const saved = Math.max(recordedSaved, plannedSaved)
  const remaining = Math.max(0, target - saved)
  const monthsRemaining = Math.max(1, (endMonth ?? currentMonth + 11) - Math.max(currentMonth, startMonth) + 1)
  const monthlyRequired = remaining / monthsRemaining
  return { target, recordedSaved, plannedSaved, saved, remaining, monthlyRequired, monthsRemaining, totalMonths, ratio: target ? saved / target : 0 }
}
