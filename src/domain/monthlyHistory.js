import { collectRecurringPayments } from './recurringPayments.js'
import { totalChildren } from './flowTree.js'

export function monthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export function dateKey(date = new Date()) {
  return `${monthKey(date)}-${String(date.getDate()).padStart(2, '0')}`
}

export function createMonthSnapshot(plan, date = new Date()) {
  const month = monthKey(date)
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  const income = (plan.incomeSources || []).reduce((sum, source) => sum + Number(source.amount || 0), 0)
  const buffer = Number(plan.buffer) || 0
  const planned = totalChildren(plan.tree)
  const payments = collectRecurringPayments(plan.tree).map(payment => ({
    ...payment,
    scheduledDate: `${month}-${String(Math.min(payment.dayOfMonth, lastDay)).padStart(2, '0')}`,
    paidDate: '',
  }))
  return { month, income, buffer, planned, payments }
}

export function monthCardSummary(snapshot) {
  if (!snapshot) return { spent: 0, remaining: 0, percent: 0 }
  const spent = snapshot.payments.filter(payment => payment.paidDate).reduce((sum, payment) => sum + payment.monthlyAmount, 0)
  const remaining = snapshot.income - spent
  const percent = snapshot.income > 0 ? Math.min(100, spent / snapshot.income * 100) : spent > 0 ? 100 : 0
  return { spent, remaining, percent }
}

// Lock the current month before the first plan edit. Later edits affect future previews.
// Never invent records for months when the app had no saved snapshot.
export function preserveCurrentMonth(plan, date = new Date()) {
  const key = monthKey(date)
  if (plan.monthlyHistory?.[key]) return plan
  const snapshot = createMonthSnapshot(plan, date)
  if (!snapshot.payments.length && !snapshot.income && !snapshot.planned) return plan
  return { ...plan, monthlyHistory: { ...plan.monthlyHistory, [key]: snapshot } }
}

export function recordPayment(plan, month, paymentId, paidDate, now = new Date()) {
  const date = new Date(`${month}-01T12:00:00`)
  if (month > monthKey(now) || !/^\d{4}-\d{2}-\d{2}$/.test(paidDate) || paidDate.slice(0, 7) !== month || paidDate > dateKey(now)) return plan
  const snapshot = plan.monthlyHistory?.[month] || (month === monthKey(now) ? createMonthSnapshot(plan, date) : null)
  const payment = snapshot?.payments.find(item => item.id === paymentId)
  if (!payment || payment.paidDate) return plan
  return { ...plan, monthlyHistory: { ...plan.monthlyHistory, [month]: {
    ...snapshot, payments: snapshot.payments.map(item => item.id === paymentId ? { ...item, paidDate } : item),
  } } }
}
