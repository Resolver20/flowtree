import { useMemo, useState } from 'react'
import { formatDate, formatMoney } from '../../lib/money'
import { FINANCE_ICON_GROUPS, FINANCE_ICON_VALUES } from './financeIcons'

function localDateValue() {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function ledgerTotal(ledger) {
  return (ledger.entries || []).reduce((total, entry) => total + (Number(entry.amount) || 0), 0)
}

function ledgerBudget(ledger) {
  return Math.max(0, Number(ledger.budget) || 0)
}

function ledgerRemaining(ledger) {
  return ledgerBudget(ledger) - ledgerTotal(ledger)
}

function LedgerEditor({ ledger, onSave, onCancel }) {
  const [name, setName] = useState(ledger?.name || '')
  const [note, setNote] = useState(ledger?.note || '')
  const [symbol, setSymbol] = useState(ledger?.symbol || 'receipt_long')
  const [budget, setBudget] = useState(ledger?.budget ?? '')
  const [error, setError] = useState('')

  function submit(event) {
    event.preventDefault()
    if (!name.trim()) { setError('Enter a name for this general ledger.'); return }
    const nextBudget = Number(budget)
    if (!Number.isFinite(nextBudget) || nextBudget < 0) { setError('Enter a valid assigned amount.'); return }
    onSave({ id: ledger?.id, name: name.trim(), note: note.trim(), symbol, budget: nextBudget })
  }

  return <form className="ledger-editor" onSubmit={submit}>
    <div className="ledger-editor-heading"><div><strong>{ledger ? `Edit ${ledger.name}` : 'Create a general ledger'}</strong><span>Keep expense tracking separate from your Home plan and savings targets.</span></div><button type="button" onClick={onCancel}>Cancel</button></div>
    <div className="ledger-form-grid"><label>GL name<input autoFocus value={name} onChange={event => { setName(event.target.value); setError('') }} maxLength="100" placeholder="e.g. Home GL" /></label><label>Expense budget assigned (₹)<input value={budget} onChange={event => { setBudget(event.target.value); setError('') }} type="number" min="0" step="0.01" placeholder="e.g. 25000" /><small>This expense budget is tracked only in this ledger, not in your Home monthly plan.</small></label><label>Note (optional)<input value={note} onChange={event => setNote(event.target.value)} maxLength="300" placeholder="e.g. Household expenses" /></label><label>GL icon<span className="icon-select"><span aria-hidden="true" className="material-symbols-rounded">{symbol}</span><select value={symbol} onChange={event => setSymbol(event.target.value)}>{!FINANCE_ICON_VALUES.has(symbol) && <option value={symbol}>Current icon</option>}{FINANCE_ICON_GROUPS.map(group => <optgroup key={`ledger-${group.label}`} label={group.label}>{group.options.map(([value, label]) => <option key={`ledger-${group.label}-${value}`} value={value}>{label}</option>)}</optgroup>)}</select></span></label></div>
    {error && <span className="field-error" role="alert">{error}</span>}
    <div className="ledger-editor-actions"><button className="ledger-save" type="submit">{ledger ? 'Save GL' : 'Create GL'}</button></div>
  </form>
}

function ExpenseEditor({ ledger, onSave }) {
  const [date, setDate] = useState(localDateValue)
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [error, setError] = useState('')

  function submit(event) {
    event.preventDefault()
    const nextAmount = Math.max(0, Number(amount) || 0)
    if (!description.trim() || !nextAmount) { setError('Enter an expense description and amount.'); return }
    onSave({ ledgerId: ledger.id, date, description: description.trim(), amount: nextAmount })
    setDescription('')
    setAmount('')
    setError('')
  }

  return <form className="expense-editor" onSubmit={submit}>
    <div><strong>Add expense</strong><span>Expenses here are records only; they do not change your Home monthly plan.</span></div>
    <div className="expense-form-grid"><label>Date<input value={date} onChange={event => setDate(event.target.value)} type="date" required /></label><label>Description<input value={description} onChange={event => { setDescription(event.target.value); setError('') }} maxLength="100" placeholder="e.g. Groceries" /></label><label>Amount (₹)<input value={amount} onChange={event => { setAmount(event.target.value); setError('') }} type="number" min="0" step="0.01" /></label><button className="ledger-save" type="submit">Add expense</button></div>
    {error && <span className="field-error" role="alert">{error}</span>}
  </form>
}

export default function GeneralLedgerView({ ledgers, onSaveLedger, onDeleteLedger, onSaveExpense, onDeleteEntry }) {
  const [selectedId, setSelectedId] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [creating, setCreating] = useState(false)
  const selected = ledgers.find(ledger => ledger.id === selectedId) || ledgers[0] || null
  const sortedEntries = useMemo(() => [...(selected?.entries || [])].sort((left, right) => right.date.localeCompare(left.date)), [selected])
  const selectedExpenses = selected ? ledgerTotal(selected) : 0
  const selectedRemaining = selected ? ledgerRemaining(selected) : 0

  function saveLedger(data) {
    setSelectedId(onSaveLedger(data))
    setCreating(false)
  }

  return <section className="ledger-view" aria-label="General ledger">
    <header className="ledger-header"><div><span className="eyebrow">GENERAL LEDGER</span><h1>General ledger</h1><p>Create separate GLs for expense tracking, such as Home, Travel, or a project. These records stay separate from the monthly planning flow.</p></div><button type="button" className="ledger-add" onClick={() => { setCreating(true); setEditingId(null) }}><span className="material-symbols-rounded" aria-hidden="true">add</span>Create GL</button></header>
    {creating && <LedgerEditor onSave={saveLedger} onCancel={() => setCreating(false)} />}
    {!ledgers.length && !creating && <div className="ledger-empty"><span className="material-symbols-rounded" aria-hidden="true">receipt_long</span><strong>No general ledgers yet</strong><p>Create a GL, then add your expenses to review them in one place.</p><button type="button" onClick={() => setCreating(true)}>Create your first GL</button></div>}
    {ledgers.length > 0 && <div className="ledger-workspace">
      <aside className="ledger-list" aria-label="Your general ledgers">{ledgers.map(ledger => { const remaining = ledgerRemaining(ledger); return <button type="button" key={ledger.id} className={ledger.id === selected?.id ? 'is-selected' : ''} aria-pressed={ledger.id === selected?.id} onClick={() => { setSelectedId(ledger.id); setEditingId(null); setCreating(false) }}><span className="material-symbols-rounded" aria-hidden="true">{ledger.symbol || 'receipt_long'}</span><span><strong>{ledger.name}</strong><small>{remaining < 0 ? `${formatMoney(Math.abs(remaining))} over budget` : `${formatMoney(remaining)} budget remaining`} · {ledger.entries.length} {ledger.entries.length === 1 ? 'expense' : 'expenses'}</small></span></button> })}</aside>
      {selected && editingId === selected.id ? <LedgerEditor ledger={selected} onSave={saveLedger} onCancel={() => setEditingId(null)} /> : selected && <div className="ledger-details">
        <div className="ledger-details-heading"><div><span className="eyebrow">{selected.note || 'EXPENSE TRACKING'}</span><h2>{selected.name}</h2></div><div className="ledger-details-actions"><button type="button" onClick={() => setEditingId(selected.id)}>Edit GL</button><button type="button" className="delete-link" onClick={() => { if (window.confirm(`Delete ${selected.name} and its ${selected.entries.length} expense records?`)) { onDeleteLedger(selected.id); setSelectedId(null) } }}>Delete GL</button></div></div>
        <div className="ledger-stat-grid" aria-label="Ledger expense budget summary"><div><span>Expense budget</span><strong>{formatMoney(ledgerBudget(selected))}</strong></div><div><span>Total expenses</span><strong>{formatMoney(selectedExpenses)}</strong></div><div className={selectedRemaining < 0 ? 'is-over' : 'is-remaining'}><span>{selectedRemaining < 0 ? 'Over budget by' : 'Budget remaining'}</span><strong>{formatMoney(Math.abs(selectedRemaining))}</strong></div></div>
        <ExpenseEditor key={selected.id} ledger={selected} onSave={onSaveExpense} />
        <section className="ledger-entries"><div className="ledger-entries-heading"><h3>Expense records</h3><span>{selected.entries.length ? 'Newest first' : 'Add your first expense above'}</span></div>{sortedEntries.length ? <div className="ledger-table-wrap"><table><thead><tr><th>Date</th><th>Description</th><th>Expense</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{sortedEntries.map(entry => <tr key={entry.id}><td>{formatDate(entry.date)}</td><td>{entry.description}</td><td>{formatMoney(entry.amount)}</td><td><button type="button" onClick={() => onDeleteEntry(selected.id, entry.id)} aria-label={`Delete ${entry.description}`}>Delete</button></td></tr>)}</tbody></table></div> : <p className="ledger-empty-entries">No expenses recorded in this GL.</p>}</section>
      </div>}
    </div>}
  </section>
}
