export function goalTargetDate(startDate, years) {
  const [year, month, day] = startDate.split('-').map(Number)
  const targetYear = year + Math.max(1, Math.round(Number(years) || 0))
  const lastDay = new Date(targetYear, month, 0).getDate()
  return `${targetYear}-${String(month).padStart(2, '0')}-${String(Math.min(day, lastDay)).padStart(2, '0')}`
}
