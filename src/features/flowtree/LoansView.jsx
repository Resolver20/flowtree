import { useMemo, useState } from 'react'
import { loanProjection } from '../../domain/loan'
import { formatMoney } from '../../lib/money'

function formatDuration(months) {
  const years = Math.floor(months / 12)
  const remainder = months % 12
  return [years ? `${years} yr` : '', remainder ? `${remainder} mo` : ''].filter(Boolean).join(' ') || '0 mo'
}

function LoanDraftSketch({ principal, remainingPrincipal, annualRate, tenureYears, extraPayment }) {
  const draft = useMemo(() => {
    // Reuse the persisted-loan calculation so a preview cannot disagree with Home after save.
    const tenureMonths = Math.round((Number(tenureYears) || 0) * 12)
    const openingBalance = Math.max(0, Number(remainingPrincipal) || 0)
    const originalPrincipal = Math.max(0, Number(principal) || 0)
    if (!originalPrincipal || !openingBalance || openingBalance > originalPrincipal || !tenureMonths) return null
    return loanProjection({
      principal: originalPrincipal,
      remainingPrincipal: openingBalance,
      annualRate: Math.max(0, Number(annualRate) || 0),
      tenureMonths,
      extraPayment: Math.max(0, Number(extraPayment) || 0),
    })
  }, [annualRate, extraPayment, principal, remainingPrincipal, tenureYears])

  return <section className="loan-draft-sketch" aria-label="Draft payoff sketch">
    <div><span className="eyebrow">WHAT-IF PLAN</span><h3>Draft payoff sketch</h3></div>
    {!draft
      ? <p>Enter the principal, balance, rate, and tenure to preview the monthly payment and payoff timeline before saving.</p>
      : <>
        <div className="loan-draft-metrics">
          <div><span>Monthly payment</span><strong>{formatMoney(draft.scheduledPayment)}</strong></div>
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
        <p className="loan-draft-note">This is a preview only. Saving applies its monthly payment to Home and queues the connected Google Drive plan for saving.</p>
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
  const [error, setError] = useState('')

  function submit(event) {
    event.preventDefault()
    const data = { principal: Math.max(0, Number(principal) || 0), remainingPrincipal: Math.max(0, Number(remainingPrincipal) || 0), annualRate: Math.max(0, Number(annualRate) || 0), tenureMonths: Math.max(1, Math.round((Number(tenureYears) || 0) * 12)), extraPayment: Math.max(0, Number(extraPayment) || 0) }
    if (!name.trim() || !data.principal || !data.remainingPrincipal || !data.tenureMonths) { setError('Enter a loan name, principal, remaining principal, and tenure.'); return }
    if (data.remainingPrincipal > data.principal) { setError('Remaining principal cannot exceed the original principal.'); return }
    onSave({ id: loan?.id, name: name.trim(), loan: data })
  }

  return <form className="loan-editor" onSubmit={submit}>
    <div className="loan-editor-heading"><div><strong>{loan ? `Edit ${loan.name}` : 'Add a loan'}</strong><span>These are planning estimates. Confirm your lender statement for the actual balance and rate.</span></div><button type="button" onClick={onCancel}>Cancel</button></div>
    <div className="loan-form-grid">
      <label>Loan name<input value={name} onChange={event => setName(event.target.value)} maxLength="100" /></label>
      <label>Original principal (₹)<input value={principal} onChange={event => setPrincipal(event.target.value)} type="number" min="0" step="0.01" /></label>
      <label>Principal remaining (₹)<input value={remainingPrincipal} onChange={event => setRemainingPrincipal(event.target.value)} type="number" min="0" step="0.01" /></label>
      <label>Interest rate (% p.a.)<input value={annualRate} onChange={event => setAnnualRate(event.target.value)} type="number" min="0" step="0.01" /></label>
      <label>Loan tenure (years)<input value={tenureYears} onChange={event => setTenureYears(event.target.value)} type="number" min="0.01" step="0.01" inputMode="decimal" aria-describedby="tenure-help" /></label>
      <label>Extra principal / month (₹)<input value={extraPayment} onChange={event => setExtraPayment(event.target.value)} type="number" min="0" step="0.01" /></label>
    </div>
    <small id="tenure-help">Enter the remaining number of years until this loan is scheduled to close.</small>
    <LoanDraftSketch principal={principal} remainingPrincipal={remainingPrincipal} annualRate={annualRate} tenureYears={tenureYears} extraPayment={extraPayment} />
    {error && <span className="field-error" role="alert">{error}</span>}
    <div className="loan-editor-actions"><button className="loan-save" type="submit">Save loan details</button></div>
  </form>
}

export default function LoansView({ loans, onSaveLoan }) {
  const [editingId, setEditingId] = useState(null)
  const [adding, setAdding] = useState(false)
  const configuredLoans = loans.filter(loan => loan.loan)
  const selected = loans.find(loan => loan.id === editingId) || configuredLoans[0] || loans[0] || null
  const projection = useMemo(() => selected?.loan ? loanProjection(selected.loan) : null, [selected])

  function saveLoan(data) {
    onSaveLoan(data)
    setEditingId(null)
    setAdding(false)
  }

  return <section className="loans-view" aria-label="Loans">
    <header className="loans-header"><div><span className="eyebrow">DEBT COMMITMENTS</span><h1>Loans</h1><p>See the monthly split between interest and principal, then model an extra payment to understand a faster payoff.</p></div><button type="button" className="loan-add" onClick={() => { setAdding(true); setEditingId(null) }}><span className="material-symbols-rounded" aria-hidden="true">add</span>Add loan</button></header>
    {!loans.length && !adding && <div className="loans-empty"><span className="material-symbols-rounded" aria-hidden="true">account_balance</span><strong>No loans in Debt Commitments</strong><p>Add a loan to create a payoff schedule and keep its monthly payment in your plan.</p><button type="button" onClick={() => setAdding(true)}>Add your first loan</button></div>}
    {adding && <LoanEditor onSave={saveLoan} onCancel={() => setAdding(false)} />}
    {loans.length > 0 && <div className="loan-workspace">
      <aside className="loan-list" aria-label="Your loans">{loans.map(loan => <button type="button" key={loan.id} className={loan.id === selected?.id ? 'is-selected' : ''} aria-pressed={loan.id === selected?.id} onClick={() => { setEditingId(loan.id); setAdding(false) }}><span className="material-symbols-rounded" aria-hidden="true">account_balance</span><span><strong>{loan.name}</strong><small>{loan.loan ? `${formatMoney(loanProjection(loan.loan).scheduledPayment)} / month` : 'Add loan details'}</small></span></button>)}</aside>
      {selected && (editingId === selected.id || !selected.loan) ? <LoanEditor loan={selected} onSave={saveLoan} onCancel={() => setEditingId(null)} /> : projection && <div className="loan-details">
        <div className="loan-details-heading"><div><span className="eyebrow">LOAN OVERVIEW</span><h2>{selected.name}</h2></div><button type="button" onClick={() => setEditingId(selected.id)}>Edit loan</button></div>
        <div className="loan-stat-grid">
          <div><span>Original principal</span><strong>{formatMoney(projection.principal)}</strong></div><div><span>Principal remaining</span><strong>{formatMoney(projection.remainingPrincipal)}</strong></div><div><span>Rate of interest</span><strong>{projection.annualRate}% p.a.</strong></div><div><span>Selected tenure</span><strong>{formatDuration(projection.tenureMonths)}</strong><small>Remaining term entered for this loan</small></div><div><span>Clearance timeline</span><strong>{formatDuration(projection.payoffMonths)}</strong><small>{projection.payoffMonths < projection.tenureMonths ? `${formatDuration(projection.tenureMonths - projection.payoffMonths)} faster with extra payment` : 'Based on remaining tenure'}</small></div>
        </div>
        <div className="loan-payment-summary"><div><span>Scheduled monthly payment</span><strong>{formatMoney(projection.scheduledPayment)}</strong><small>Base EMI {formatMoney(projection.basePayment)}{projection.extraPayment ? ` + ${formatMoney(projection.extraPayment)} extra principal` : ''}</small></div><div><span>Projected interest remaining</span><strong>{formatMoney(projection.totalInterest)}</strong><small>Estimate at the current rate</small></div></div>
        <section className="loan-schedule"><div><h3>Repayment schedule</h3><p>Each row shows how your payment moves from interest to principal and lowers the remaining balance.</p></div><div className="loan-table-wrap"><table><thead><tr><th>Month</th><th>Payment</th><th>Interest</th><th>Principal</th><th>Principal remaining</th></tr></thead><tbody>{projection.rows.map(row => <tr key={row.month}><td>{row.month}</td><td>{formatMoney(row.payment)}</td><td>{formatMoney(row.interest)}</td><td>{formatMoney(row.principal)}</td><td>{formatMoney(row.balance)}</td></tr>)}</tbody></table></div></section>
      </div>}
    </div>}
  </section>
}
