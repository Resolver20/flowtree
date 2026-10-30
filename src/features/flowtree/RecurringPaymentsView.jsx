import { useMemo, useState } from 'react'
import { recurringPaymentSummary } from '../../domain/recurringPayments'
import { formatMoney } from '../../lib/money'

function dayLabel(day) {
  const lastTwo = day % 100
  const suffix = lastTwo >= 11 && lastTwo <= 13 ? 'th' : day % 10 === 1 ? 'st' : day % 10 === 2 ? 'nd' : day % 10 === 3 ? 'rd' : 'th'
  return `${day}${suffix}`
}

function monthLabel(date) {
  return new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' }).format(date)
}

function fullDateLabel(date) {
  return new Intl.DateTimeFormat('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(date)
}

function monthDays(date) {
  const year = date.getFullYear()
  const month = date.getMonth()
  const leadingBlankDays = new Date(year, month, 1).getDay()
  const count = new Date(year, month + 1, 0).getDate()
  return [...Array(leadingBlankDays).fill(null), ...Array.from({ length: count }, (_, index) => new Date(year, month, index + 1))]
}

export default function RecurringPaymentsView({ tree, onSaveDay }) {
  const today = useMemo(() => new Date(), [])
  const [month, setMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1))
  const [selectedDate, setSelectedDate] = useState(today)
  const { payments, paymentsByDay, monthlyTotal } = useMemo(() => recurringPaymentSummary(tree), [tree])
  const selectedPayments = paymentsByDay[selectedDate.getDate()] || []

  function moveMonth(offset) {
    const next = new Date(month.getFullYear(), month.getMonth() + offset, 1)
    setMonth(next)
    setSelectedDate(next)
  }

  return <section className="recurring-view" aria-label="Recurring payments">
    <header className="recurring-header"><div><span className="eyebrow">RECURRING PAYMENTS</span><h1>Monthly payment calendar</h1><p>Choose a date to see the recurring payments scheduled for that day. These amounts are included in the same Home monthly plan.</p></div></header>
    {!payments.length ? <div className="recurring-empty"><span className="material-symbols-rounded" aria-hidden="true">event_repeat</span><strong>No recurring payments yet</strong><p>Add a monthly amount to any plan card and it will appear on this calendar.</p></div> : <>
      <section className="recurring-calendar" aria-label={monthLabel(month)}><div className="recurring-calendar-heading"><div><span>Scheduled in {monthLabel(month)}</span><strong>{formatMoney(monthlyTotal)}</strong></div><div className="calendar-month-actions"><button type="button" onClick={() => moveMonth(-1)} aria-label="Previous month"><span className="material-symbols-rounded" aria-hidden="true">chevron_left</span></button><strong>{monthLabel(month)}</strong><button type="button" onClick={() => moveMonth(1)} aria-label="Next month"><span className="material-symbols-rounded" aria-hidden="true">chevron_right</span></button></div></div><div className="calendar-weekdays" aria-hidden="true">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => <span key={day}>{day}</span>)}</div><div className="calendar-grid">{monthDays(month).map((date, index) => {
        if (!date) return <span className="calendar-blank" key={`blank-${index}`} />
        const dayPayments = paymentsByDay[date.getDate()] || []
        const total = dayPayments.reduce((sum, payment) => sum + payment.monthlyAmount, 0)
        const selected = date.getFullYear() === selectedDate.getFullYear() && date.getMonth() === selectedDate.getMonth() && date.getDate() === selectedDate.getDate()
        return <button type="button" className={`calendar-day${selected ? ' is-selected' : ''}${dayPayments.length ? ' has-payments' : ''}`} key={date.toISOString()} onClick={() => setSelectedDate(date)} aria-pressed={selected} aria-label={`${fullDateLabel(date)}${dayPayments.length ? `, ${dayPayments.length} scheduled payment${dayPayments.length === 1 ? '' : 's'}, ${formatMoney(total)}` : ', no scheduled payments'}`}><strong>{date.getDate()}</strong>{dayPayments.length > 0 && <small>{formatMoney(total)}</small>}</button>
      })}</div></section>
      <section className="recurring-day-details" aria-live="polite"><div><span className="eyebrow">SELECTED DATE</span><h2>{fullDateLabel(selectedDate)}</h2><p>{selectedPayments.length ? `${selectedPayments.length} recurring payment${selectedPayments.length === 1 ? '' : 's'} scheduled for this date.` : 'No recurring payments are scheduled for this date.'}</p></div>{selectedPayments.length > 0 && <div className="recurring-day-list">{selectedPayments.map(payment => <article key={payment.id}><span className="material-symbols-rounded" aria-hidden="true">{payment.symbol}</span><div><strong>{payment.name}</strong><small>{payment.category}</small></div><strong>{formatMoney(payment.monthlyAmount)} <small>/ month</small></strong><label>Move to<select value={payment.dayOfMonth} onChange={event => onSaveDay(payment.id, Number(event.target.value))}>{Array.from({ length: 31 }, (_, index) => index + 1).map(day => <option key={day} value={day}>{dayLabel(day)}</option>)}</select></label></article>)}</div>}</section>
    </>}
  </section>
}
