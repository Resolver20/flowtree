import { useMemo, useState } from 'react'
import { monthlyAllocation, NODE_STATUSES } from '../../domain/flowTree'
import { formatDate, formatMoney } from '../../lib/money'

function futureDate() {
  const date = new Date()
  date.setFullYear(date.getFullYear() + 1)
  return date.toISOString().slice(0, 10)
}

function GoalEditor({ goal, onSave, onCancel }) {
  const [name, setName] = useState(goal?.name || 'New life goal')
  const [amount, setAmount] = useState(goal?.amount ?? '')
  const [period, setPeriod] = useState(goal?.period || 'month')
  const [dueDate, setDueDate] = useState(goal?.dueDate || futureDate())
  const [status, setStatus] = useState(goal?.status || 'active')
  const [error, setError] = useState('')
  const preview = useMemo(() => monthlyAllocation({ amount: Number(amount) || 0, period, dueDate, status, children: [] }), [amount, dueDate, period, status])

  function submit(event) {
    event.preventDefault()
    const nextAmount = Math.max(0, Number(amount) || 0)
    if (!name.trim() || !nextAmount) { setError('Enter a goal name and a target amount.'); return }
    if (period === 'year' && (!dueDate || dueDate <= new Date().toISOString().slice(0, 10))) { setError('Choose a future target date.'); return }
    onSave({ id: goal?.id, name: name.trim(), amount: nextAmount, period, dueDate: period === 'year' ? dueDate : '', status })
  }

  return <form className="goal-editor" onSubmit={submit}>
    <div className="goal-editor-heading"><div><strong>{goal ? `Edit ${goal.name}` : 'Add a life goal'}</strong><span>Life goals are planning targets. Their monthly requirement appears in your Home money flow.</span></div><button type="button" onClick={onCancel}>Cancel</button></div>
    <div className="goal-form-grid">
      <label>Goal name<input value={name} onChange={event => setName(event.target.value)} maxLength="100" /></label>
      <label>{period === 'year' ? 'Target amount (₹)' : 'Monthly target (₹)'}<input value={amount} onChange={event => setAmount(event.target.value)} type="number" min="0" step="0.01" /></label>
      <label>Planning frequency<select value={period} onChange={event => setPeriod(event.target.value)}><option value="month">Monthly</option><option value="year">Yearly target</option></select></label>
      {period === 'year' && <label>Target date<input value={dueDate} onChange={event => setDueDate(event.target.value)} type="date" min={futureDate()} /></label>}
      <label>Status<select value={status} onChange={event => setStatus(event.target.value)}>{NODE_STATUSES.map(item => <option key={item} value={item}>{item[0].toUpperCase() + item.slice(1)}</option>)}</select></label>
    </div>
    <div className="goal-preview"><span>Monthly amount reflected in Home</span><strong>{formatMoney(preview)}</strong><small>{period === 'year' ? 'FlowTree spreads this target across the time left until the target date.' : 'This is added to the Life goals branch every month.'}</small></div>
    {error && <span className="field-error" role="alert">{error}</span>}
    <div className="goal-editor-actions"><button className="goal-save" type="submit">Save life goal</button></div>
  </form>
}

export default function GoalsView({ goals, onSaveGoal }) {
  const [editingId, setEditingId] = useState(null)
  const [adding, setAdding] = useState(false)
  const selected = goals.find(goal => goal.id === editingId) || goals[0] || null

  function saveGoal(data) {
    onSaveGoal(data)
    setEditingId(null)
    setAdding(false)
  }

  return <section className="goals-view" aria-label="Life goals">
    <header className="goals-header"><div><span className="eyebrow">LIFE GOALS</span><h1>Life goals</h1><p>Create each goal here, then see its monthly requirement flow into the same Home plan as your other priorities.</p></div><button type="button" className="goal-add" onClick={() => { setAdding(true); setEditingId(null) }}><span className="material-symbols-rounded" aria-hidden="true">add</span>Add goal</button></header>
    {!goals.length && !adding && <div className="goals-empty"><span className="material-symbols-rounded" aria-hidden="true">flag</span><strong>No life goals yet</strong><p>Add a goal to include its monthly target in your Home flow.</p><button type="button" onClick={() => setAdding(true)}>Add your first goal</button></div>}
    {adding && <GoalEditor onSave={saveGoal} onCancel={() => setAdding(false)} />}
    {goals.length > 0 && <div className="goals-workspace">
      <aside className="goal-list" aria-label="Your life goals">{goals.map(goal => <button type="button" key={goal.id} className={goal.id === selected?.id ? 'is-selected' : ''} onClick={() => { setEditingId(goal.id); setAdding(false) }}><span className="material-symbols-rounded" aria-hidden="true">{goal.icon || 'flag'}</span><span><strong>{goal.name}</strong><small>{formatMoney(monthlyAllocation(goal))} / month</small></span></button>)}</aside>
      {selected && editingId === selected.id ? <GoalEditor goal={selected} onSave={saveGoal} onCancel={() => setEditingId(null)} /> : selected && <div className="goal-details">
        <div className="goal-details-heading"><div><span className="eyebrow">GOAL OVERVIEW</span><h2>{selected.name}</h2></div><button type="button" onClick={() => setEditingId(selected.id)}>Edit goal</button></div>
        <div className="goal-stat-grid"><div><span>{selected.period === 'year' ? 'Target amount' : 'Monthly target'}</span><strong>{formatMoney(selected.amount)}</strong></div><div><span>Monthly plan contribution</span><strong>{formatMoney(monthlyAllocation(selected))}</strong></div><div><span>Target date</span><strong>{selected.period === 'year' ? formatDate(selected.dueDate) : 'Ongoing'}</strong></div><div><span>Status</span><strong>{selected.status[0].toUpperCase() + selected.status.slice(1)}</strong></div></div>
        <section className="goal-home-link"><span className="material-symbols-rounded" aria-hidden="true">account_tree</span><div><strong>Included in your Home flow</strong><p>Home adds this goal to Life goals as {formatMoney(monthlyAllocation(selected))} each month.</p></div></section>
      </div>}
    </div>}
  </section>
}
