import { useState } from 'react'
import { NODE_STATUSES } from '../../domain/flowTree'
import { formatMoney } from '../../lib/money'
import { FINANCE_ICON_GROUPS, FINANCE_ICON_VALUES } from './financeIcons'

function InvestmentEditor({ investment, onSave, onCancel }) {
  const [name, setName] = useState(investment?.name || 'New investment')
  const [type, setType] = useState(investment?.investment?.type || 'Mutual fund')
  const [amount, setAmount] = useState(investment?.amount ?? '')
  const [currentValue, setCurrentValue] = useState(investment?.investment?.currentValue ?? '')
  const [symbol, setSymbol] = useState(investment?.symbol || investment?.icon || 'trending_up')
  const [status, setStatus] = useState(investment?.status || 'active')
  const [error, setError] = useState('')

  function submit(event) {
    event.preventDefault()
    const nextAmount = Math.max(0, Number(amount) || 0)
    const nextCurrentValue = Math.max(0, Number(currentValue) || 0)
    if (!name.trim() || !nextAmount) {
      setError('Enter an investment name and monthly contribution.')
      return
    }
    if (!type.trim()) {
      setError('Enter an investment type.')
      return
    }
    onSave({ id: investment?.id, name: name.trim(), type: type.trim(), amount: nextAmount, currentValue: nextCurrentValue, status, symbol })
  }

  return <form className="goal-editor investment-editor" onSubmit={submit}>
    <div className="goal-editor-heading"><div><strong>{investment ? `Edit ${investment.name}` : 'Add an investment'}</strong><span>Monthly contributions flow into Home. Current value is a record you enter; FlowTree does not retrieve market prices.</span></div><button type="button" onClick={onCancel}>Cancel</button></div>
    <div className="goal-form-grid">
      <label>Investment name<input value={name} onChange={event => setName(event.target.value)} maxLength="100" /></label>
      <label>Investment type<input value={type} onChange={event => setType(event.target.value)} maxLength="64" placeholder="Mutual fund, PF, equity…" /></label>
      <label>Monthly contribution (₹)<input value={amount} onChange={event => setAmount(event.target.value)} type="number" min="0" step="0.01" /></label>
      <label>Current value (₹)<input value={currentValue} onChange={event => setCurrentValue(event.target.value)} type="number" min="0" step="0.01" /></label>
      <label>Investment icon<span className="icon-select"><span aria-hidden="true" className="material-symbols-rounded">{symbol}</span><select value={symbol} onChange={event => setSymbol(event.target.value)}>{!FINANCE_ICON_VALUES.has(symbol) && <option value={symbol}>Current icon</option>}{FINANCE_ICON_GROUPS.map(group => <optgroup key={`investment-${group.label}`} label={group.label}>{group.options.map(([value, label]) => <option key={`investment-${group.label}-${value}`} value={value}>{label}</option>)}</optgroup>)}</select></span></label>
      <label>Status<select value={status} onChange={event => setStatus(event.target.value)}>{NODE_STATUSES.map(item => <option key={item} value={item}>{item[0].toUpperCase() + item.slice(1)}</option>)}</select></label>
    </div>
    <div className="goal-preview investment-preview"><span>Monthly amount reflected in Home</span><strong>{formatMoney(Math.max(0, Number(amount) || 0))}</strong><span>Recorded current value</span><strong>{formatMoney(Math.max(0, Number(currentValue) || 0))}</strong><small>This helps you track the plan; it is not a live market value or an account balance.</small></div>
    {error && <span className="field-error" role="alert">{error}</span>}
    <div className="goal-editor-actions"><button className="goal-save investment-save" type="submit">Save investment</button></div>
  </form>
}

export default function InvestmentsView({ investments, onSaveInvestment }) {
  const [editingId, setEditingId] = useState(null)
  const [adding, setAdding] = useState(false)
  const selected = investments.find(investment => investment.id === editingId) || investments[0] || null

  function saveInvestment(data) {
    onSaveInvestment(data)
    setEditingId(null)
    setAdding(false)
  }

  return <section className="goals-view investments-view" aria-label="Investments">
    <header className="goals-header investments-header"><div><span className="eyebrow">LONG-TERM GROWTH</span><h1>Investments</h1><p>Keep your long-term investments together, record their current value, and include each monthly contribution in the same Home plan.</p></div><button type="button" className="goal-add investment-add" onClick={() => { setAdding(true); setEditingId(null) }}><span className="material-symbols-rounded" aria-hidden="true">add</span>Add investment</button></header>
    {!investments.length && !adding && <div className="goals-empty investments-empty"><span className="material-symbols-rounded" aria-hidden="true">trending_up</span><strong>No investments in Long-Term Growth</strong><p>Add an investment to include its monthly contribution in your Home flow.</p><button type="button" onClick={() => setAdding(true)}>Add your first investment</button></div>}
    {adding && <InvestmentEditor onSave={saveInvestment} onCancel={() => setAdding(false)} />}
    {investments.length > 0 && <div className="goals-workspace investments-workspace">
      <aside className="goal-list investment-list" aria-label="Your investments">{investments.map(investment => <button type="button" key={investment.id} className={investment.id === selected?.id ? 'is-selected' : ''} aria-pressed={investment.id === selected?.id} onClick={() => { setEditingId(investment.id); setAdding(false) }}><span className="material-symbols-rounded" aria-hidden="true">{investment.symbol || investment.icon || 'trending_up'}</span><span><strong>{investment.name}</strong><small>{formatMoney(investment.amount)} / month</small></span></button>)}</aside>
      {selected && editingId === selected.id ? <InvestmentEditor investment={selected} onSave={saveInvestment} onCancel={() => setEditingId(null)} /> : selected && <div className="goal-details investment-details">
        <div className="goal-details-heading"><div><span className="eyebrow">INVESTMENT OVERVIEW</span><h2>{selected.name}</h2></div><button type="button" onClick={() => setEditingId(selected.id)}>Edit investment</button></div>
        <div className="goal-stat-grid investment-stat-grid"><div><span>Current value</span><strong>{formatMoney(selected.investment?.currentValue || 0)}</strong></div><div><span>Monthly contribution</span><strong>{formatMoney(selected.amount)}</strong></div><div><span>Investment type</span><strong>{selected.investment?.type || 'Investment'}</strong></div><div><span>Status</span><strong>{selected.status[0].toUpperCase() + selected.status.slice(1)}</strong></div></div>
        <section className="goal-home-link investment-home-link"><span className="material-symbols-rounded" aria-hidden="true">account_tree</span><div><strong>Included in your Home flow</strong><p>Home adds this investment to Long-Term Growth as {formatMoney(selected.amount)} each month.</p></div></section>
      </div>}
    </div>}
  </section>
}
