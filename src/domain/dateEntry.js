export function displayDateInput(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || '')
  return match ? `${match[3]}/${match[2]}/${match[1]}` : ''
}

export function parseDateInput(value) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim())
  if (!match) return ''
  const [, day, month, year] = match.map(Number)
  if (year < 1) return ''
  const candidate = new Date(0)
  candidate.setFullYear(year, month - 1, day)
  if (candidate.getFullYear() !== year || candidate.getMonth() !== month - 1 || candidate.getDate() !== day) return ''
  return `${match[3]}-${match[2]}-${match[1]}`
}

export function formatDateTyping(text) {
  if (!/^[\d/]*$/.test(text)) return text
  const digits = text.replaceAll('/', '')
  if (digits.length > 8) return text
  return [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4)].filter(Boolean).join('/')
}

export function dateEntryError(text, { min, max } = {}) {
  if (!text) return '' // The native required constraint handles empty fields.
  const value = parseDateInput(text)
  if (!value) return 'Enter a valid date as DD/MM/YYYY.'
  if (min && value < min) return `Choose a date on or after ${displayDateInput(min)}.`
  if (max && value > max) return `Choose a date on or before ${displayDateInput(max)}.`
  return ''
}
