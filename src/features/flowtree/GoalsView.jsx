import CardStartSetup from './CardStartSetup'
import GoalSavingsSummary from './GoalSavingsSummary'
import InactiveMarker from './InactiveMarker'
import { useMemo, useState } from 'react'
import { annualTargetProgress, monthlyAllocation, requiredMonthlyAmount, NODE_STATUSES, normalizeNodeStatus } from '../../domain/flowTree'
import { formatDate, formatMoney } from '../../lib/money'
import { FINANCE_ICON_GROUPS, FINANCE_ICON_VALUES } from './financeIcons'
import { goalTargetDate } from '../../domain/goalDates'

function dateValue(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function todayDate() {
  return dateValue(new Date())
}

function GoalEditor({ goal, onSave, onCancel }) {
  const [name, setName] = useState(goal?.name || 'New life goal')
  const [amount, setAmount] = useState(goal?.amount ?? '')
  const [symbol, setSymbol] = useState(goal?.symbol || goal?.icon || 'flag')
  const period = 'year'
  const [startDate, setStartDate] = useState(goal?.startDate || todayDate())
  const [startMode, setStartMode] = useState(goal?.startDate ? 'existing' : 'fresh')
  const [dueDate, setDueDate] = useState(goal?.dueDate || goalTargetDate(todayDate(), 1))
  const [savedAmount, setSavedAmount] = useState(goal?.savedAmount ?? '')
  const [status, setStatus] = useState(normalizeNodeStatus(goal?.status || 'active'))
  const [error, setError] = useState('')
  const previewGoal = useMemo(() => ({ amount: Number(amount) || 0, savedAmount: Number(savedAmount) || 0, startDate, period, dueDate, status, children: [] }), [amount, dueDate, period, savedAmount, startDate, status])

  function submit(event) {
    event.preventDefault()
    const nextAmount = Math.max(0, Number(amount) || 0)
    const nextSavedAmount = Math.max(0, Number(savedAmount) || 0)
    if (!name.trim() || !nextAmount) { setError('Enter a goal name and a target amount.'); return }
    if (period === 'year' && (!startDate || !dueDate || dueDate < startDate)) { setError('Choose an end date on or after the goal start date.'); return }
    if (nextSavedAmount > nextAmount) { setError('Already accumulated cannot exceed the target amount.'); return }
    onSave({ id: goal?.id, name: name.trim(), amount: nextAmount, savedAmount: period === 'year' ? nextSavedAmount : 0, startDate, period, dueDate: period === 'year' ? dueDate : '', status, symbol })
  }

  return <form className="goal-editor" onSubmit={submit}>
    <div className="goal-editor-heading"><div><strong>{goal ? `Edit ${goal.name}` : 'Add a life goal'}</strong><span>Set your target and end date, then choose whether to start fresh or calculate progress from an earlier start date.</span></div><button type="button" onClick={onCancel}>Cancel</button></div>
    <div className="goal-form-grid">
      <label>Goal name<input value={name} onChange={event => setName(event.target.value)} maxLength="100" /></label>
      <label>Target amount (₹)<input value={amount} onChange={event => setAmount(event.target.value)} type="number" min="0" step="0.01" /></label>
      <label>Goal icon<span className="icon-select"><span aria-hidden="true" className="material-symbols-rounded">{symbol}</span><select value={symbol} onChange={event => setSymbol(event.target.value)}>{!FINANCE_ICON_VALUES.has(symbol) && <option value={symbol}>Current icon</option>}{FINANCE_ICON_GROUPS.map(group => <optgroup key={`goal-${group.label}`} label={group.label}>{group.options.map(([value, label]) => <option key={`goal-${group.label}-${value}`} value={value}>{label}</option>)}</optgroup>)}</select></span></label>
      <CardStartSetup mode={startMode} onModeChange={mode => { setStartMode(mode); if (mode === 'fresh') { setStartDate(todayDate()); setSavedAmount(0) } setError('') }} startDate={startDate} onStartDateChange={date => { setStartDate(date); setError('') }} />
      {period === 'year' && <><label>Target date<input type="date" value={dueDate} onChange={event => { setDueDate(event.target.value); setError('') }} required /></label><label>Already accumulated (₹)<input value={savedAmount} onChange={event => setSavedAmount(event.target.value)} type="number" min="0" step="0.01" /></label></>}
      <label>Status<select value={status} onChange={event => setStatus(event.target.value)}>{NODE_STATUSES.map(item => <option key={item} value={item}>{item[0].toUpperCase() + item.slice(1)}</option>)}</select></label>
    </div>
    <small>Inactive goals stay out of the monthly plan. You can still set their start and target dates.</small>
    <GoalSavingsSummary goal={previewGoal} />
    {error && <span className="field-error" role="alert">{error}</span>}
    <div className="goal-editor-actions"><button className="goal-save" type="submit">Save life goal</button></div>
  </form>
}

export default function GoalsView({ goals, focusedGoalId, onSaveGoal }) {
  const [selectedId, setSelectedId] = useState(focusedGoalId || null)
  const [editingId, setEditingId] = useState(null)
  const [adding, setAdding] = useState(false)
  const selected = goals.find(goal => goal.id === selectedId) || null

  function saveGoal(data) {
    onSaveGoal(data)
    if (data.id) setSelectedId(data.id)
    setEditingId(null)
    setAdding(false)
  }

  return <section className="goals-view" aria-label="Life goals">
    <header className="goals-header"><div><span className="eyebrow">LIFE GOALS</span><h1>Life goals</h1><p>Create each goal here, then see its monthly requirement flow into the same Home plan as your other priorities.</p></div><button type="button" className="goal-add" onClick={() => { setAdding(true); setEditingId(null); setSelectedId(null) }}><span className="material-symbols-rounded" aria-hidden="true">add</span>Add goal</button></header>
    {!goals.length && !adding && <div className="goals-empty"><span className="material-symbols-rounded" aria-hidden="true">flag</span><strong>No life goals yet</strong><p>Add a goal to include its monthly target in your Home flow.</p><button type="button" onClick={() => setAdding(true)}>Add your first goal</button></div>}
    {adding && <GoalEditor onSave={saveGoal} onCancel={() => setAdding(false)} />}
    {goals.length > 0 && <div className="goals-workspace">
      <aside className="goal-list" aria-label="Your life goals">{goals.map(goal => <button type="button" key={goal.id} className={goal.id === selected?.id ? 'is-selected' : ''} aria-pressed={goal.id === selected?.id} onClick={() => { setSelectedId(goal.id); setEditingId(null); setAdding(false) }}><span className="material-symbols-rounded" aria-hidden="true">{goal.symbol || goal.icon || 'flag'}</span><span><strong>{goal.name}</strong><small>{formatMoney(requiredMonthlyAmount(goal))} / month</small></span><InactiveMarker inactive={normalizeNodeStatus(goal.status) === 'inactive'} /></button>)}</aside>
      {selected && editingId === selected.id ? <GoalEditor goal={selected} onSave={saveGoal} onCancel={() => setEditingId(null)} /> : selected ? <div className="goal-details">
        <div className="goal-details-heading"><div><span className="eyebrow">GOAL OVERVIEW</span><h2>{selected.name}</h2></div><button type="button" onClick={() => setEditingId(selected.id)}>Edit goal</button></div>
        <GoalProgress goal={selected} />
        <section className="goal-home-link"><span className="material-symbols-rounded" aria-hidden="true">account_tree</span><div><strong>{normalizeNodeStatus(selected.status) === 'inactive' ? 'Inactive — monthly allocation paused' : 'Included in your Home flow'}</strong><p>{normalizeNodeStatus(selected.status) === 'inactive' ? `Estimated ${formatMoney(requiredMonthlyAmount(selected))} per month. Activate this goal to include it in Home.` : `Home adds this goal to Life goals as ${formatMoney(monthlyAllocation(selected))} each month.`}</p></div></section>
      </div> : <GoalPortfolioOverview goals={goals} onSelect={setSelectedId} />}
    </div>}
  </section>
}

function GoalPortfolioOverview({ goals, onSelect }) {
  const totals = goals.reduce((total, goal) => {
    const progress = annualTargetProgress(goal)
    return { target: total.target + Math.max(0, Number(goal.amount) || 0), saved: total.saved + (progress?.saved || 0), monthly: total.monthly + monthlyAllocation(goal) }
  }, { target: 0, saved: 0, monthly: 0 })

  return <section className="goal-portfolio" aria-label="Life goals overview">
    <div><span className="eyebrow">LIFE GOALS OVERVIEW</span><h2>Your goals at a glance</h2><p>Select a goal to view its details or edit it. Home uses the calculated monthly amount for every active goal.</p></div>
    <div className="goal-stat-grid"><div><span>Total target value</span><strong>{formatMoney(totals.target)}</strong><small>Across {goals.length} goal{goals.length === 1 ? '' : 's'}</small></div><div><span>Planned or accumulated</span><strong>{formatMoney(totals.saved)}</strong><small>Progress recorded against your targets</small></div><div><span>Monthly amount in Home</span><strong>{formatMoney(totals.monthly)}</strong><small>Combined active goal contributions</small></div></div>
    <div className="goal-portfolio-list">{goals.map(goal => <button type="button" key={goal.id} onClick={() => onSelect(goal.id)}><span><strong>{goal.name}</strong><small>{formatMoney(requiredMonthlyAmount(goal))} / month</small></span><InactiveMarker inactive={normalizeNodeStatus(goal.status) === 'inactive'} /><span className="material-symbols-rounded" aria-hidden="true">arrow_forward</span></button>)}</div>
  </section>
}

function GoalProgress({ goal }) {
  const progress = annualTargetProgress(goal)
  return <>
    <div className="goal-stat-grid"><div><span>{goal.period === 'year' ? 'Target amount' : 'Monthly target'}</span><strong>{formatMoney(goal.amount)}</strong></div><div><span>Needed monthly</span><strong>{formatMoney(requiredMonthlyAmount(goal))}</strong></div><div><span>Monthly plan contribution</span><strong>{formatMoney(monthlyAllocation(goal))}</strong></div><div><span>End date</span><strong>{goal.period === 'year' ? formatDate(goal.dueDate) : 'Ongoing'}</strong></div><div><span>Status</span><strong>{normalizeNodeStatus(goal.status)[0].toUpperCase() + normalizeNodeStatus(goal.status).slice(1)}</strong></div></div>
    <GoalSavingsSummary goal={goal} />
    {progress && <section className="goal-progress" aria-label={`${goal.name} progress`}><div><span>Progress to end date</span><strong>{Math.round(progress.ratio * 100)}%</strong></div><div className="goal-progress-track" aria-hidden="true"><span style={{ width: `${progress.ratio * 100}%` }} /></div><small>{formatMoney(progress.saved)} planned or accumulated of {formatMoney(progress.target)}</small></section>}
  </>
}
