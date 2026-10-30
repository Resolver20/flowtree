import { useState } from 'react'
import { createMonthSnapshot, monthCardSummary, monthKey } from '../../domain/monthlyHistory'
import { formatMoney } from '../../lib/money'

const monthName = date => new Intl.DateTimeFormat('en-IN', { month: 'long' }).format(date)

export default function RecurringPaymentsView({ plan }) {
  const [year, setYear] = useState(() => new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(() => monthKey())
  const currentMonth = monthKey()
  const months = Array.from({ length: 12 }, (_, index) => {
    const date = new Date(year, index, 1)
    const key = monthKey(date)
    const saved = plan.monthlyHistory?.[key]
    const snapshot = saved || (key >= currentMonth ? createMonthSnapshot(plan, date) : null)
    const { spent, remaining, percent } = monthCardSummary(snapshot)
    return { key, date, snapshot, spent, remaining, percent, saved: Boolean(saved) }
  })
  const selected = months.find(month => month.key === selectedMonth)

  function changeYear(offset) {
    const nextYear = year + offset
    setYear(nextYear)
    setSelectedMonth(`${nextYear}-01`)
  }

  return <section className="recurring-view" aria-label="Recurring payments">
    <header className="recurring-header"><div><span className="eyebrow">RECURRING PAYMENTS</span><h1>Monthly payments</h1><p>Choose a month to see its payments. Spending uses recorded paid amounts; remaining money is available to save, not confirmed savings.</p></div></header>
    <div className="calendar-month-actions month-year-navigation"><button type="button" aria-label="Previous year" onClick={() => changeYear(-1)}>‹</button><strong>{year}</strong><button type="button" aria-label="Next year" onClick={() => changeYear(1)}>›</button></div>
    <div className="payment-month-cards">{months.map(month => <button type="button" key={month.key} className={`payment-month-card${selectedMonth === month.key ? ' is-selected' : ''}`} onClick={() => setSelectedMonth(month.key)} aria-pressed={selectedMonth === month.key}>
      <strong>{monthName(month.date)}</strong>
      <small>{month.saved ? 'Saved month' : month.snapshot ? 'Plan preview' : 'No saved history'}</small>
      {month.snapshot ? <>
        <span className={`month-money-bar${month.snapshot.income <= 0 ? ' has-no-income' : ''}`} aria-label={`${formatMoney(month.spent)} recorded spent; ${formatMoney(month.remaining)} remaining`}><span style={{ width: `${month.percent}%` }} /></span>
        <span className="month-money-labels"><span>Spent<strong>{formatMoney(month.spent)}</strong></span><span>{month.remaining < 0 ? 'Shortfall' : 'Left to save'}<strong>{formatMoney(month.remaining)}</strong></span></span>
      </> : <span className="month-no-history">No amounts recorded</span>}
    </button>)}</div>
    {selected && <section className="recurring-day-details" aria-live="polite">
      <h2>{monthName(selected.date)} {year}</h2>
      <p>{!selected.snapshot ? 'No saved payment history for this month.' : selected.saved ? 'Saved amounts stay unchanged when the plan is edited.' : 'Planned payments for this month.'}</p>
      {selected.snapshot && !selected.snapshot.payments.length && <p>No recurring payments.</p>}
      <div className="recurring-day-list">{selected.snapshot?.payments.map(payment => <article key={payment.id}>
        <span className="material-symbols-rounded" aria-hidden="true">{payment.symbol}</span>
        <div><strong>{payment.name}</strong><small>{payment.category}</small></div>
        <strong>{formatMoney(payment.monthlyAmount)}</strong>
        <small>{payment.paidDate ? `Paid ${payment.paidDate}` : 'Planned'}</small>
      </article>)}</div>
    </section>}
  </section>
}
