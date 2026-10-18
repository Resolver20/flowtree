const MONTHS_PER_YEAR = 12

function amount(value) {
  return Math.max(0, Number(value) || 0)
}

function rate(value) {
  return Math.max(0, Number(value) || 0)
}

function wholeMonths(value) {
  return Math.max(1, Math.round(Number(value) || 0))
}

export function monthlyPayment(principal, annualRate, tenureMonths) {
  const balance = amount(principal)
  const months = wholeMonths(tenureMonths)
  const monthlyRate = rate(annualRate) / 100 / MONTHS_PER_YEAR
  if (!monthlyRate) return balance / months
  const factor = (1 + monthlyRate) ** months
  return balance * monthlyRate * factor / (factor - 1)
}

export function loanSchedule({ remainingPrincipal, annualRate, tenureMonths, extraPayment = 0 }) {
  const openingBalance = amount(remainingPrincipal)
  const months = wholeMonths(tenureMonths)
  const monthlyRate = rate(annualRate) / 100 / MONTHS_PER_YEAR
  const basePayment = monthlyPayment(openingBalance, annualRate, months)
  const scheduledPayment = basePayment + amount(extraPayment)
  const rows = []
  let balance = openingBalance

  for (let month = 1; month <= months && balance > 0.005; month += 1) {
    const interest = balance * monthlyRate
    const payment = Math.min(scheduledPayment, balance + interest)
    const principal = Math.max(0, payment - interest)
    balance = Math.max(0, balance - principal)
    rows.push({ month, payment, interest, principal, balance })
  }

  const totalInterest = rows.reduce((sum, row) => sum + row.interest, 0)
  const totalPaid = rows.reduce((sum, row) => sum + row.payment, 0)
  return { basePayment, scheduledPayment, rows, payoffMonths: rows.length, totalInterest, totalPaid }
}

export function loanProjection(loan) {
  const principal = amount(loan?.principal)
  const remainingPrincipal = Math.min(principal || Infinity, amount(loan?.remainingPrincipal ?? principal))
  const tenureMonths = wholeMonths(loan?.tenureMonths)
  const annualRate = rate(loan?.annualRate)
  const schedule = loanSchedule({ remainingPrincipal, annualRate, tenureMonths, extraPayment: loan?.extraPayment })
  return { principal, remainingPrincipal, annualRate, tenureMonths, extraPayment: amount(loan?.extraPayment), ...schedule }
}
