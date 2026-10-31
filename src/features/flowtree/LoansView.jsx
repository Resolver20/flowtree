import { useMemo, useState } from 'react'
import { NODE_STATUSES, normalizeNodeStatus, monthlyAllocation } from '../../domain/flowTree'
import { loanProjection } from '../../domain/loan'
import { formatMoney } from '../../lib/money'
import { shouldShowLoanPreview } from './loanPreview'
import { useConfirmation } from '../../hooks/useConfirmation'
import ConfirmationDialog from './ConfirmationDialog'

function formatDuration(months) {
  const years = Math.floor(months / 12)
  const remainder = months % 12
  return [years ? `${years} yr` : '', remainder ? `${remainder} mo` : ''].filter(Boolean).join(' ') || '0 mo'
}

function LoanDraftSketch({ principal, remainingPrincipal, annualRate, tenureYears, extraPayment, userMonthlyContribution, status }) {
  const draft = useMemo(() => {
    // Reuse the persisted-loan calculation so a preview cannot disagree with Home after save.
    const tenureMonths = Math.round((Number(tenureYears) || 0) * 12)
    const openingBalance = Number(remainingPrincipal)
    const originalPrincipal = Math.max(0, Number(principal) || 0)
    if (!originalPrincipal || !Number.isFinite(openingBalance) || openingBalance > originalPrincipal || !tenureMonths) return null
    return loanProjection({
      principal: originalPrincipal,
      remainingPrincipal: openingBalance,
      annualRate: Math.max(0, Number(annualRate) || 0),
      tenureMonths,
      extraPayment: Math.max(0, Number(extraPayment) || 0),
      ...(userMonthlyContribution === '' ? {} : { userMonthlyContribution: Math.max(0, Number(userMonthlyContribution) || 0) }),
    })
  }, [annualRate, extraPayment, principal, remainingPrincipal, tenureYears, userMonthlyContribution])

  return <section className="loan-draft-sketch" aria-label="Draft payoff sketch">
    <div><span className="eyebrow">WHAT-IF PLAN</span><h3>Draft payoff sketch</h3></div>
    {!draft
      ? <p>Enter the principal, balance, rate, and tenure to preview the monthly payment and payoff timeline before saving.</p>
      : <>
        <div className="loan-draft-metrics">
          <div><span>Scheduled monthly payment</span><strong>{formatMoney(draft.scheduledPayment)}</strong></div>
          <div><span>Your amount in Home</span><strong>{formatMoney(monthlyAllocation({ amount: draft.userMonthlyContribution, status }))}</strong></div>
          <div><span>Selected tenure</span><strong>{formatDuration(draft.tenureMonths)}</strong></div>
          <div><span>Draft payoff</span><strong>{formatDuration(draft.payoffMonths)}</strong></div>
          <div><span>Total payable</span><strong>{formatMoney(draft.totalPaid)}</strong></div>
          <div><span>Total interest payable</span><strong>{formatMoney(draft.totalInterest)}</strong></div>
        </div>
        <div className="loan-draft-timeline" aria-label={`Draft payoff in ${formatDuration(draft.payoffMonths)} against a ${formatDuration(draft.tenureMonths)} tenure`}>
          <span>Payoff timeline</span>
          <div aria-hidden="true"><i style={{ width: `${Math.min(100, draft.payoffMonths / draft.tenureMonths * 100)}%` }} /></div>
          <small>{draft.payoffMonths < draft.tenureMonths ? `${formatDuration(draft.tenureMonths - draft.payoffMonths)} faster with the draft extra payment.` : `Matches the ${formatDuration(draft.tenureMonths)} tenure.`}</small>
        </div>
        <p className="loan-draft-note">This is a preview only. Saving applies your monthly contribution to Home and queues the connected Google Drive plan for saving.</p>
      </>}
  </section>
}

function LoanEditor({ loan, onSave, onCancel }) {
  const [name, setName] = useState(loan?.name || 'New loan')
  const [principal, setPrincipal] = useState(loan?.loan?.principal ?? '')
  const [remainingPrincipal, setRemainingPrincipal] = useState(loan?.loan?.remainingPrincipal ?? loan?.loan?.principal ?? '')
  const [annualRate, setAnnualRate] = useState(loan?.loan?.annualRate ?? '')
  const [tenureYears, setTenureYears] = useState(loan?.loan?.tenureMonths ? loan.loan.tenureMonths / 12 : '')
  const [extraPayment, setExtraPayment] = useState(loan?.loan?.extraPayment ?? 0)
  const [userMonthlyContribution, setUserMonthlyContribution] = useState(loan?.loan?.userMonthlyContribution ?? '')
  const [status, setStatus] = useState(normalizeNodeStatus(loan?.status))
  const [error, setError] = useState('')

  function submit(event) {
    event.preventDefault()
    const data = { principal: Math.max(0, Number(principal) || 0), remainingPrincipal: Number(remainingPrincipal), annualRate: Math.max(0, Number(annualRate) || 0), tenureMonths: Math.max(1, Math.round((Number(tenureYears) || 0) * 12)), extraPayment: Math.max(0, Number(extraPayment) || 0), ...(userMonthlyContribution === '' ? {} : { userMonthlyContribution: Math.max(0, Number(userMonthlyContribution) || 0) }) }
    if (!name.trim() || !data.principal || !Number.isFinite(data.remainingPrincipal) || !data.tenureMonths) { setError('Enter a loan name, principal, remaining principal, and tenure.'); return }
    if (data.remainingPrincipal > data.principal) { setError('Remaining principal cannot exceed the original principal.'); return }
    if (data.remainingPrincipal > 0 && data.userMonthlyContribution !== undefined && data.userMonthlyContribution > loanProjection(data).scheduledPayment) { setError('Your monthly contribution cannot exceed the scheduled monthly payment.'); return }
    onSave({ id: loan?.id, name: name.trim(), status, startDate: loan?.startDate || '', loan: data })
  }

  return <form className="loan-editor" onSubmit={submit}>
    <div className="loan-editor-heading"><div><strong>{loan ? `Edit ${loan.name}` : 'Add a loan'}</strong><span>These are planning estimates. Confirm your lender statement for the actual balance and rate.</span></div><button type="button" onClick={onCancel}>Cancel</button></div>
    <div className="loan-form-grid">
      <label>Loan name<input value={name} onChange={event => setName(event.target.value)} maxLength="100" /></label>
      <label>Original principal (₹)<input value={principal} onChange={event => setPrincipal(event.target.value)} type="number" min="0" step="0.01" /></label>
      <label>Principal remaining (₹)<input value={remainingPrincipal} onChange={event => setRemainingPrincipal(event.target.value)} type="number" step="0.01" /></label>
      <label>Interest rate (% p.a.)<input value={annualRate} onChange={event => setAnnualRate(event.target.value)} type="number" min="0" step="0.01" /></label>
      <label>Loan tenure (years)<input value={tenureYears} onChange={event => setTenureYears(event.target.value)} type="number" min="0.01" max="50" step="0.01" inputMode="decimal" aria-describedby="tenure-help" /></label>
      <label>Extra principal / month (₹)<input value={extraPayment} onChange={event => setExtraPayment(event.target.value)} type="number" min="0" step="0.01" /></label>
      <label>Your contribution / month (₹)<input value={userMonthlyContribution} onChange={event => setUserMonthlyContribution(event.target.value)} type="number" min="0" step="0.01" placeholder="Full payment" /></label>
      <label>Status<select value={status} onChange={event => setStatus(event.target.value)}>{NODE_STATUSES.map(value => <option key={value} value={value}>{value === 'active' ? 'Active' : 'Inactive'}</option>)}</select></label>
    </div>
    <small id="tenure-help">Enter the remaining number of years until this loan is scheduled to close.</small>
    <LoanDraftSketch principal={principal} remainingPrincipal={remainingPrincipal} annualRate={annualRate} tenureYears={tenureYears} extraPayment={extraPayment} userMonthlyContribution={userMonthlyContribution} status={status} />
    {error && <span className="field-error" role="alert">{error}</span>}
    <div className="loan-editor-actions"><button className="loan-save" type="submit">Save loan details</button></div>
  </form>
}

function LoanPortfolioOverview({ loans, onSelect }) {
  const configuredLoans = loans.filter(loan => loan.loan)
  const totals = configuredLoans.reduce((total, loan) => {
    const projection = loanProjection(loan.loan)
    return {
      remainingPrincipal: total.remainingPrincipal + projection.remainingPrincipal,
      scheduledPayment: total.scheduledPayment + projection.scheduledPayment,
      userMonthlyContribution: total.userMonthlyContribution + monthlyAllocation(loan),
    }
  }, { remainingPrincipal: 0, scheduledPayment: 0, userMonthlyContribution: 0 })

  return <section className="loan-portfolio" aria-label="Loan overview">
    <div><span className="eyebrow">LOAN OVERVIEW</span><h2>Your loans at a glance</h2><p>Select a loan to see its details. The repayment schedule stays separate, so this page starts with the amounts that matter for your plan.</p></div>
    <div className="loan-stat-grid">
      <div><span>Total principal remaining</span><strong>{formatMoney(totals.remainingPrincipal)}</strong><small>Across {configuredLoans.length} configured loan{configuredLoans.length === 1 ? '' : 's'}</small></div>
      <div><span>Total scheduled payment</span><strong>{formatMoney(totals.scheduledPayment)}</strong><small>The combined lender payment each month</small></div>
      <div><span>Your amount in Home</span><strong>{formatMoney(totals.userMonthlyContribution)}</strong><small>Your combined monthly contributions</small></div>
    </div>
    <div className="loan-portfolio-list">
      {loans.map(loan => <button type="button" key={loan.id} onClick={() => onSelect(loan.id)}><span><strong>{loan.name}</strong><small>{loan.loan ? `${formatMoney(loanProjection(loan.loan).remainingPrincipal)} remaining` : 'Add loan details'}</small></span><span className="material-symbols-rounded" aria-hidden="true">arrow_forward</span></button>)}
    </div>
  </section>
}

export default function LoansView({ loans, focusedLoanId, onSaveLoan, onDeleteLoan }) {
  const confirmation = useConfirmation()
  const [selectedId, setSelectedId] = useState(focusedLoanId || null)
  const [editingId, setEditingId] = useState(null)
  const [adding, setAdding] = useState(false)
  const [scheduleLoanId, setScheduleLoanId] = useState(null)
  const selected = loans.find(loan => loan.id === selectedId) || null
  const projection = useMemo(() => selected?.loan ? loanProjection(selected.loan) : null, [selected])
  const showSchedule = scheduleLoanId === selected?.id

  function saveLoan(data) {
    onSaveLoan(data)
    if (data.id) setSelectedId(data.id)
    setScheduleLoanId(null)
    setEditingId(null)
    setAdding(false)
  }

  async function deleteLoan() {
    if (!selected || !await confirmation.confirm({ title: `Delete ${selected.name}?`, message: 'This removes its repayment details and monthly contribution from Home.', confirmLabel: 'Delete loan' })) return
    onDeleteLoan(selected.id)
    setSelectedId(null)
    setScheduleLoanId(null)
    setEditingId(null)
  }

  function showPreview() {
    setSelectedId(null)
    setScheduleLoanId(null)
  }

  function handleOutsideClick(event) {
    if (shouldShowLoanPreview(event.target, { selected, editingId, adding })) showPreview()
  }

  return <section className="loans-view" aria-label="Loans" onClick={handleOutsideClick}>
    {confirmation.request && <ConfirmationDialog confirmation={confirmation} />}
    <header className="loans-header"><div><span className="eyebrow">DEBT COMMITMENTS</span><h1>Loans</h1><p>Review your total loan commitments, then open a loan when you want its full overview or repayment schedule.</p></div><button type="button" className="loan-add" onClick={() => { setAdding(true); setEditingId(null); setSelectedId(null); setScheduleLoanId(null) }}><span className="material-symbols-rounded" aria-hidden="true">add</span>Add loan</button></header>
    {!loans.length && !adding && <div className="loans-empty"><span className="material-symbols-rounded" aria-hidden="true">account_balance</span><strong>No loans in Debt Commitments</strong><p>Add a loan to create a payoff schedule and keep its monthly payment in your plan.</p><button type="button" onClick={() => setAdding(true)}>Add your first loan</button></div>}
    {adding && <LoanEditor onSave={saveLoan} onCancel={() => setAdding(false)} />}
    {loans.length > 0 && <div className="loan-workspace">
      <aside className="loan-list" aria-label="Your loans">{loans.map(loan => <button type="button" key={loan.id} className={loan.id === selected?.id ? 'is-selected' : ''} aria-pressed={loan.id === selected?.id} onClick={() => { setSelectedId(loan.id); setScheduleLoanId(null); setEditingId(null); setAdding(false) }}><span className="material-symbols-rounded" aria-hidden="true">account_balance</span><span><strong>{loan.name}</strong><small>{loan.loan ? `${formatMoney(monthlyAllocation(loan))} in Home / month` : 'Add loan details'}</small></span></button>)}</aside>
      {!selected ? <LoanPortfolioOverview loans={loans} onSelect={setSelectedId} /> : (editingId === selected.id || !selected.loan) ? <LoanEditor loan={selected} onSave={saveLoan} onCancel={() => setEditingId(null)} /> : projection && <div className="loan-details">
        <div className="loan-details-heading"><div><span className="eyebrow">LOAN OVERVIEW</span><h2>{selected.name}</h2></div><div className="loan-details-actions"><button type="button" onClick={showPreview}>Back to preview</button><button type="button" onClick={() => setEditingId(selected.id)}>Edit loan</button><button type="button" className="delete-link" onClick={deleteLoan}>Delete loan</button></div></div>
        <div className="loan-stat-grid">
          <div><span>Original principal</span><strong>{formatMoney(projection.principal)}</strong></div><div><span>Principal remaining</span><strong>{formatMoney(projection.remainingPrincipal)}</strong></div><div><span>Rate of interest</span><strong>{projection.annualRate}% p.a.</strong></div><div><span>Selected tenure</span><strong>{formatDuration(projection.tenureMonths)}</strong><small>Remaining term entered for this loan</small></div><div><span>Clearance timeline</span><strong>{formatDuration(projection.payoffMonths)}</strong><small>{projection.payoffMonths < projection.tenureMonths ? `${formatDuration(projection.tenureMonths - projection.payoffMonths)} faster with extra payment` : 'Based on remaining tenure'}</small></div>
        </div>
        <div className="loan-payment-summary"><div><span>Scheduled monthly payment</span><strong>{formatMoney(projection.scheduledPayment)}</strong><small>Base EMI {formatMoney(projection.basePayment)}{projection.extraPayment ? ` + ${formatMoney(projection.extraPayment)} extra principal` : ''}</small></div><div><span>Your amount in Home</span><strong>{formatMoney(monthlyAllocation(selected))}</strong><small>Only your contribution is included in the monthly plan</small></div><div><span>Projected interest remaining</span><strong>{formatMoney(projection.totalInterest)}</strong><small>Estimate at the current rate</small></div></div>
        <section className="loan-schedule"><div><h3>Repayment schedule</h3><p>View the complete month-by-month projection when you need the detailed lender schedule.</p><button type="button" className="loan-schedule-toggle" onClick={() => setScheduleLoanId(showSchedule ? null : selected.id)} aria-expanded={showSchedule}>{showSchedule ? 'Hide full repayment schedule' : 'View full repayment schedule'}</button></div>{showSchedule && <div className="loan-table-wrap" tabIndex={0} role="region" aria-label="Full repayment schedule"><table><thead><tr><th>Month</th><th>Payment</th><th>Interest</th><th>Principal</th><th>Principal remaining</th></tr></thead><tbody>{projection.rows.map(row => <tr key={row.month}><td>{row.month}</td><td>{formatMoney(row.payment)}</td><td>{formatMoney(row.interest)}</td><td>{formatMoney(row.principal)}</td><td>{formatMoney(row.balance)}</td></tr>)}</tbody></table></div>}</section>
      </div>}
    </div>}
  </section>
}
