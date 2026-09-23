import { useEffect, useRef, useState } from 'react'
import { annualTargetProgress, countBranch, expectedAnnualSavings, findNode, monthlyAllocation, monthlyTotal, NODE_STATUSES, totalChildren } from '../../domain/flowTree'
import { formatDate, formatMoney } from '../../lib/money'
import { iconForNode } from './nodePresentation'
import { FINANCE_ICON_GROUPS, FINANCE_ICON_VALUES } from './financeIcons'
import DriveSyncDialog from './DriveSyncDialog'

const formatStatus = status => status[0].toUpperCase() + status.slice(1)

function localDateValue(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function defaultAnnualTargetDate() {
  const date = new Date()
  date.setFullYear(date.getFullYear() + 1)
  return localDateValue(date)
}

function tomorrowDate() {
  const date = new Date()
  date.setDate(date.getDate() + 1)
  return localDateValue(date)
}

function displayDateValue(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || '')
  return match ? `${match[3]}/${match[2]}/${match[1]}` : ''
}

function formatIncomeStart(value) {
  if (!value) return 'Starts today'
  const date = new Date(`${value}T00:00:00`)
  return Number.isNaN(date.getTime()) ? 'Start date not set' : `Starts ${date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}`
}

function parseDateValue(value) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim())
  if (!match) return ''
  const [, day, month, year] = match.map(Number)
  const candidate = new Date(year, month - 1, day)
  if (candidate.getFullYear() !== year || candidate.getMonth() !== month - 1 || candidate.getDate() !== day) return ''
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function DialogShell({ title, children, onClose, wide = false }) {
  const ref = useRef(null)
  useEffect(() => {
    const opener = document.activeElement
    const element = ref.current
    element.showModal()
    element.querySelector('input, select')?.focus()
    return () => { element.close(); if (opener?.isConnected) opener.focus() }
  }, [])
  return <dialog ref={ref} className={`modal ${wide ? 'is-wide' : ''}`} aria-labelledby="dialog-title" onCancel={event => { event.preventDefault(); onClose() }}>
      <button type="button" className="close" aria-label="Close" onClick={onClose}>×</button>
      <h2 id="dialog-title">{title}</h2>
      {children}
  </dialog>
}

function ProfileManageDialog({ profile, onClose, onDelete, onRequestEdit, onRequestAddIncome }) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  if (confirmDelete) return <DialogShell title={`Remove ${profile.name}?`} onClose={onClose}>
    <p>This removes only the profile marker from the graph. Income sources and the monthly plan remain unchanged.</p>
    <div className="dialog-actions"><button type="button" onClick={() => setConfirmDelete(false)}>Keep marker</button><button type="button" className="danger-button" onClick={onDelete}>Remove marker</button></div>
  </DialogShell>

  return <DialogShell title={profile.name} onClose={onClose}>
    <div className="card-overview"><span className="overview-icon material-symbols-rounded" aria-hidden="true">person</span><div><span>Profile marker</span><strong>{profile.name}</strong></div></div>
    <div className="dialog-actions manage-actions"><button type="button" className="delete-link" onClick={() => setConfirmDelete(true)}>Remove…</button><button type="button" onClick={onRequestAddIncome}>Add income source</button><button type="button" className="modal-submit" onClick={onRequestEdit}>Edit name</button></div>
  </DialogShell>
}

function ProfileDialog({ profile, onClose, onSave }) {
  return <DialogShell title="Edit profile" onClose={onClose}>
    <p>This label identifies the starting point of your money flow.</p>
    <form onSubmit={event => { event.preventDefault(); const name = String(new FormData(event.currentTarget).get('name') || '').trim(); if (!name) return; onSave(name); onClose() }}>
      <label>Name<input autoFocus name="name" maxLength="50" defaultValue={profile.name} required /></label>
      <div className="dialog-actions"><button type="button" onClick={onClose}>Cancel</button><button className="modal-submit">Save profile</button></div>
    </form>
  </DialogShell>
}

function IncomeSourceManageDialog({ source, onClose, onDelete, onRequestEdit }) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  if (confirmDelete) return <DialogShell title={`Delete ${source.name}?`} onClose={onClose}>
    <p>This removes the income source and subtracts {formatMoney(source.amount)} from the monthly plan. Financial destinations remain unchanged.</p>
    <div className="dialog-actions"><button type="button" onClick={() => setConfirmDelete(false)}>Keep source</button><button type="button" className="danger-button" onClick={() => onDelete(source.id)}>Delete source</button></div>
  </DialogShell>

  return <DialogShell title={source.name} onClose={onClose}>
    <div className="card-overview"><span className="overview-icon material-symbols-rounded" aria-hidden="true">{source.icon || 'payments'}</span><div><span>Monthly income source</span><strong>{formatMoney(source.amount)} <small>/month</small></strong><small>{formatIncomeStart(source.startDate)} · paid on the {source.dayOfMonth || 1}{(source.dayOfMonth || 1) === 1 ? 'st' : (source.dayOfMonth || 1) === 2 ? 'nd' : (source.dayOfMonth || 1) === 3 ? 'rd' : 'th'} of each month</small></div></div>
    <div className="dialog-actions manage-actions"><button type="button" className="delete-link" onClick={() => setConfirmDelete(true)}>Delete…</button><button type="button" className="modal-submit" onClick={() => onRequestEdit(source.id)}>Edit details</button></div>
  </DialogShell>
}

function IncomeSourceDialog({ source, onClose, onSave }) {
  const [symbol, setSymbol] = useState(source?.icon || 'payments')
  const [error, setError] = useState('')
  return <DialogShell title={source ? 'Edit income source' : 'Add income source'} onClose={onClose}>
    <p>Every active income source flows into the shared monthly plan. The date is a planning marker; Flowtree never moves money automatically.</p>
    <form onSubmit={event => { event.preventDefault(); const form = new FormData(event.currentTarget); const name = String(form.get('name') || '').trim(); if (!name) { setError('Enter a name, not just spaces.'); return } onSave({ sourceId: source?.id, name, amount: Math.max(0, Number(form.get('amount')) || 0), icon: symbol, startDate: String(form.get('startDate') || ''), dayOfMonth: Math.min(31, Math.max(1, Number(form.get('dayOfMonth')) || 1)) }); onClose() }}>
      <label>Name<input autoFocus name="name" maxLength="100" defaultValue={source?.name || ''} placeholder="e.g. Salary" onChange={() => setError('')} required /></label>
      {error && <span role="alert" className="field-error">{error}</span>}
      <div className="form-grid">
        <label>Amount per month (₹)<input name="amount" type="number" min="0" step="0.01" defaultValue={source?.amount ?? ''} required /></label>
        <label>Starts on<input name="startDate" type="date" defaultValue={source?.startDate || localDateValue()} required /></label>
        <label>Pay day each month<input name="dayOfMonth" type="number" min="1" max="31" step="1" defaultValue={source?.dayOfMonth || 1} required /></label>
        <label>Icon<span className="icon-select"><span aria-hidden="true" className="material-symbols-rounded">{symbol}</span><select value={symbol} onChange={event => setSymbol(event.target.value)}>{!FINANCE_ICON_VALUES.has(symbol) && <option value={symbol}>Current icon</option>}{FINANCE_ICON_GROUPS.map(group => <optgroup key={group.label} label={group.label}>{group.options.map(([value, label]) => <option key={`income-${group.label}-${value}`} value={value}>{label}</option>)}</optgroup>)}</select></span></label>
      </div>
      <div className="dialog-actions"><button type="button" onClick={onClose}>Cancel</button><button className="modal-submit">{source ? 'Save changes' : 'Add income source'}</button></div>
    </form>
  </DialogShell>
}

function BufferDialog({ buffer, onClose, onSave }) {
  return <DialogShell title="Safety buffer" onClose={onClose}>
    <p>This amount is reserved before your monthly destinations are planned.</p>
    <form onSubmit={event => { event.preventDefault(); onSave(Math.max(0, Number(new FormData(event.currentTarget).get('buffer')))); onClose() }}>
      <label>Buffer per month (₹)<input autoFocus type="number" name="buffer" min="0" step="0.01" defaultValue={buffer} required /></label>
      <button className="modal-submit">Save buffer</button>
    </form>
  </DialogShell>
}

function collectAnnualTargets(nodes, parents = []) {
  return nodes.flatMap(node => {
    const path = [...parents, node.name]
    const own = node.period === 'year' ? [{ node, parentPath: parents.join(' / ') }] : []
    return [...own, ...collectAnnualTargets(node.children || [], path)]
  })
}

function AnnualTargetsDialog({ tree, onClose, onSave }) {
  const targets = collectAnnualTargets(tree)
  const [drafts, setDrafts] = useState(() => targets.map(({ node, parentPath }) => ({
    id: node.id,
    name: node.name,
    amount: node.amount,
    dueDate: node.dueDate || defaultAnnualTargetDate(),
    status: node.status,
    parentPath,
    node,
  })))
  const [error, setError] = useState('')

  function changeDraft(id, changes) {
    setDrafts(current => current.map(draft => draft.id === id ? { ...draft, ...changes } : draft))
    setError('')
  }

  function submit(event) {
    event.preventDefault()
    if (drafts.some(draft => !draft.name.trim())) { setError('Every yearly target needs a name.'); return }
    if (drafts.some(draft => !draft.dueDate || draft.dueDate < tomorrowDate())) { setError('Every target date must be in the future.'); return }
    onSave(drafts.map(draft => {
      const preview = { ...draft.node, name: draft.name.trim(), amount: Math.max(0, Number(draft.amount) || 0), dueDate: draft.dueDate, status: draft.status }
      return { id: draft.id, changes: { name: preview.name, amount: preview.amount, dueDate: preview.dueDate, status: preview.status, savedAmount: expectedAnnualSavings(preview) } }
    }))
    onClose()
  }

  return <DialogShell title="Yearly targets" onClose={onClose} wide>
    <p>Review every annual commitment and savings goal together. Expected progress and monthly requirements update as you edit.</p>
    {!drafts.length ? <div className="empty-annual-targets"><strong>No yearly targets yet</strong><span>Change a destination’s frequency to Yearly and it will appear here.</span></div> : <form onSubmit={submit}>
      <div className="annual-target-list">
        {drafts.map(draft => {
          const preview = { ...draft.node, name: draft.name, amount: Math.max(0, Number(draft.amount) || 0), dueDate: draft.dueDate, status: draft.status }
          const progress = annualTargetProgress(preview)
          return <section className="annual-target-row" key={draft.id}>
            <div className="annual-target-heading"><input aria-label="Target name" value={draft.name} onChange={event => changeDraft(draft.id, { name: event.target.value })} /><small>{draft.parentPath || 'Top-level category'}</small></div>
            <label>Annual target (₹)<input type="number" min="0" step="0.01" value={draft.amount} onChange={event => changeDraft(draft.id, { amount: event.target.value })} /></label>
            <label>Target date<input type="date" min={tomorrowDate()} value={draft.dueDate} onChange={event => changeDraft(draft.id, { dueDate: event.target.value })} /></label>
            <label>Status<select value={draft.status} onChange={event => changeDraft(draft.id, { status: event.target.value })}>{NODE_STATUSES.map(status => <option key={status} value={status}>{formatStatus(status)}</option>)}</select></label>
            <div className="annual-target-summary"><span><small>Expected saved</small><strong>{formatMoney(progress.saved)}</strong></span><span><small>Progress</small><strong>{Math.round(progress.ratio * 100)}%</strong></span><span><small>Needed monthly</small><strong>{formatMoney(monthlyAllocation(preview))}</strong></span></div>
          </section>
        })}
      </div>
      {error && <span role="alert" className="field-error">{error}</span>}
      <div className="dialog-actions"><button type="button" onClick={onClose}>Cancel</button><button className="modal-submit">Save all yearly targets</button></div>
    </form>}
  </DialogShell>
}

function ImportPlanDialog({ dialog, onClose, onImport }) {
  const { summary, fileName } = dialog
  return <DialogShell title="Import Flowtree plan?" onClose={onClose}>
    <p><strong>{fileName}</strong> is valid. Importing it will replace the plan currently stored in this browser.</p>
    <dl className="import-summary">
      <div><dt>Income sources</dt><dd>{summary.incomeSources}</dd></div>
      <div><dt>Destinations</dt><dd>{summary.destinations}</dd></div>
      <div><dt>Yearly targets</dt><dd>{summary.yearlyTargets}</dd></div>
    </dl>
    <div className="import-warning">Export your current plan first if you may need it later. You can also undo immediately after importing, until the next plan change or reload.</div>
    <div className="dialog-actions"><button type="button" onClick={onClose}>Cancel</button><button type="button" className="danger-button" onClick={() => onImport(dialog.data)}>Replace my plan</button></div>
  </DialogShell>
}

function ManageDialog({ node, onClose, onDelete, onRequestEdit, onRequestAdd }) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const progress = annualTargetProgress(node)
  const children = node.children || []

  if (confirmDelete) return <DialogShell title={`Delete ${node.name}?`} onClose={onClose}>
    <p>This removes {node.name}{countBranch(node) > 1 ? ` and ${countBranch(node) - 1} nested items` : ''} from your plan. Its monthly target is {formatMoney(monthlyTotal(node))}. You can undo this until your next change or reload.</p>
    <div className="dialog-actions"><button autoFocus type="button" onClick={() => setConfirmDelete(false)}>Keep item</button><button type="button" className="danger-button" onClick={() => onDelete(node.id)}>Delete {countBranch(node) > 1 ? 'branch' : 'item'}</button></div>
  </DialogShell>

  return <DialogShell title={node.name} onClose={onClose}>
    <div className="card-overview">
      <span className="overview-icon material-symbols-rounded" aria-hidden="true">{iconForNode(node)}</span>
      <div><span>{formatStatus(node.status)} · {node.period === 'year' ? 'Yearly target' : 'Monthly target'}</span><strong>{formatMoney(node.amount || 0)} <small>/{node.period === 'year' ? 'year' : 'month'}</small></strong></div>
    </div>
    {progress && <div className="target-preview">
      <div><span>Expected progress</span><strong>{Math.round(progress.ratio * 100)}%</strong></div>
      <progress value={progress.saved} max={progress.target || 1} />
      <small>{formatMoney(progress.saved)} expected of {formatMoney(progress.target)} · {formatMoney(monthlyAllocation(node))} planned monthly</small>
    </div>}
    <dl className="card-facts">
      <div><dt>Monthly branch total</dt><dd>{formatMoney(monthlyTotal(node))}</dd></div>
      {node.period === 'year' && <div><dt>Target date</dt><dd>{formatDate(node.dueDate)}</dd></div>}
      <div><dt>Direct children</dt><dd>{children.length}</dd></div>
    </dl>
    <div className="dialog-actions manage-actions">
      <button type="button" className="delete-link" onClick={() => setConfirmDelete(true)}>Delete…</button>
      <button type="button" onClick={() => onRequestAdd(node.id)}>Add child</button>
      <button type="button" className="modal-submit" onClick={() => onRequestEdit(node.id)}>Edit details</button>
    </div>
  </DialogShell>
}

function NodeDialog({ dialog, tree, onClose, onSave, onDelete }) {
  const node = dialog.nodeId ? findNode(tree, dialog.nodeId) : null
  const parent = dialog.parentId ? findNode(tree, dialog.parentId) : null
  const isEditing = Boolean(node)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [amount, setAmount] = useState(node?.amount ?? '')
  const [period, setPeriod] = useState(node?.period || 'month')
  const initialDueDate = node?.dueDate || (node?.period === 'year' ? defaultAnnualTargetDate() : '')
  const [dueDate, setDueDate] = useState(initialDueDate)
  const [dateText, setDateText] = useState(displayDateValue(initialDueDate))
  const [dateError, setDateError] = useState('')
  const [status, setStatus] = useState(node?.status || 'active')
  const [symbol, setSymbol] = useState(node ? iconForNode(node) : 'savings')
  const [error, setError] = useState('')
  const previewNode = { amount, savedAmount: node?.savedAmount || 0, dueDate, period, status, children: node?.children || [] }
  const preview = monthlyTotal(previewNode)
  const annualProgress = annualTargetProgress(previewNode)

  function submit(event) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const name = String(form.get('name') || '').trim()
    if (!name) { setError('Enter a name, not just spaces.'); return }
    if (period === 'year') {
      const parsedDate = parseDateValue(dateText)
      if (!parsedDate) { setDateError('Enter a valid date as DD/MM/YYYY.'); return }
      if (parsedDate < tomorrowDate()) { setDateError('Choose a future date.'); return }
    }
    onSave({
      nodeId: dialog.nodeId,
      parentId: dialog.parentId,
      name,
      amount: Math.max(0, Number(form.get('amount')) || 0),
      savedAmount: period === 'year' ? annualProgress.saved : 0,
      dueDate: period === 'year' ? dueDate : '',
      period: String(form.get('period')),
      status: String(form.get('status')),
      symbol,
    })
    onClose()
  }

  if (confirmDelete) return <DialogShell title={`Delete ${node.name}?`} onClose={onClose}>
    <p>This removes {node.name}{countBranch(node) > 1 ? ` and ${countBranch(node) - 1} nested items` : ''} from your plan. Its monthly target is {formatMoney(monthlyTotal(node))}. No money is moved. You can undo this until your next change or reload.</p>
    <div className="dialog-actions"><button autoFocus type="button" onClick={() => setConfirmDelete(false)}>Keep item</button><button type="button" className="danger-button" onClick={() => onDelete(node.id)}>Delete {countBranch(node) > 1 ? 'branch' : 'item'}</button></div>
  </DialogShell>

  return <DialogShell title={isEditing ? 'Edit destination' : parent ? 'Add destination' : 'Add category'} onClose={onClose}>
    <p>{isEditing ? 'Changes update this node and its parent totals.' : `This node will sit under ${parent?.name || 'Monthly income'}.`}</p>
    <form onSubmit={submit}>
      <label>Name<input autoFocus name="name" maxLength={100} defaultValue={node?.name || ''} placeholder="e.g. Subscriptions" onChange={() => setError('')} required aria-invalid={Boolean(error)} aria-describedby={error ? 'name-error' : undefined} /></label>
      {error && <span id="name-error" role="alert" className="field-error">{error}</span>}
      <div className="form-grid">
        <label>Own amount (₹)<input name="amount" type="number" min="0" step="0.01" value={amount} onChange={event => setAmount(event.target.value)} placeholder="0" aria-describedby="amount-help" /></label>
        <label>Frequency<select name="period" value={period} onChange={event => { const nextPeriod = event.target.value; setPeriod(nextPeriod); if (nextPeriod === 'year' && !dueDate) { const nextDate = defaultAnnualTargetDate(); setDueDate(nextDate); setDateText(displayDateValue(nextDate)) } }}><option value="month">Monthly</option><option value="year">Yearly</option></select></label>
      </div>
      <small id="amount-help">Exclude child amounts — they are added automatically. Leave at 0 for a grouping category.</small>
      {period === 'year' && <>
        <label>Target date<span className="date-entry"><input name="dueDateText" type="text" inputMode="numeric" placeholder="DD/MM/YYYY" value={dateText} onChange={event => { const text = event.target.value; setDateText(text); setDateError(''); const parsed = parseDateValue(text); if (parsed) setDueDate(parsed) }} aria-invalid={Boolean(dateError)} aria-describedby={dateError ? 'date-error' : undefined} /><input className="date-picker" aria-label="Choose target date from calendar" type="date" min={tomorrowDate()} value={dueDate} onChange={event => { setDueDate(event.target.value); setDateText(displayDateValue(event.target.value)); setDateError('') }} /><button type="button" onClick={() => { const nextDate = defaultAnnualTargetDate(); setDueDate(nextDate); setDateText(displayDateValue(nextDate)); setDateError('') }}>One year from today</button></span></label>
        {dateError && <span id="date-error" role="alert" className="field-error">{dateError}</span>}
        <div className="calculated-field"><span>Expected saved so far</span><strong>{formatMoney(annualProgress.saved)}</strong><small>Calculated automatically from a 12-month cycle ending on the target date.</small></div>
        <div className="target-preview" aria-live="polite">
          <div><span>Expected progress</span><strong>{Math.round(annualProgress.ratio * 100)}%</strong></div>
          <progress value={annualProgress.saved} max={annualProgress.target || 1} />
          <small>{formatMoney(annualProgress.saved)} saved of {formatMoney(annualProgress.target)} · {formatMoney(monthlyAllocation(previewNode))} needed monthly{dueDate ? ` until ${formatDate(dueDate)}` : ' over the next 12 months'}</small>
        </div>
      </>}
      <div className="form-grid">
        <label>Icon<span className="icon-select"><span aria-hidden="true" className="material-symbols-rounded">{symbol}</span><select value={symbol} onChange={event => setSymbol(event.target.value)}>{!FINANCE_ICON_VALUES.has(symbol) && <option value={symbol}>Current icon</option>}{FINANCE_ICON_GROUPS.map(group => <optgroup key={group.label} label={group.label}>{group.options.map(([value, label]) => <option key={`${group.label}-${value}`} value={value}>{label}</option>)}</optgroup>)}</select></span></label>
        <label>Status<select name="status" value={status} onChange={event => setStatus(event.target.value)}>{NODE_STATUSES.map(status => <option key={status} value={status}>{formatStatus(status)}</option>)}</select></label>
      </div>
      <small>Funded and dormant items pause the entire branch’s allocation.</small>
      <div className="amount-preview" aria-live="polite"><span>Monthly branch total<small>Includes {formatMoney(totalChildren(node?.children || []))} in child targets</small></span><strong>{formatMoney(preview)}</strong></div>
      <div className="dialog-actions">{isEditing && <button type="button" className="delete-link" onClick={() => setConfirmDelete(true)}>Delete…</button>}<button type="button" onClick={onClose}>Cancel</button><button className="modal-submit">{isEditing ? 'Save changes' : 'Add to tree'}</button></div>
    </form>
  </DialogShell>
}

export default function PlanDialog({ dialog, profile, incomeSources, buffer, tree, driveStatus, driveUser, driveError, onClose, onSaveProfile, onDeleteProfile, onSaveIncomeSource, onDeleteIncomeSource, onSaveAnnualTargets, onSaveBuffer, onSaveNode, onDeleteNode, onImportData, onRequestEdit, onRequestAdd, onRequestEditIncomeSource, onRequestEditProfile, onRequestAddIncomeSource, onConnectDrive, onDisconnectDrive }) {
  if (!dialog) return null
  if (dialog.type === 'driveSync') return <DriveSyncDialog status={driveStatus} user={driveUser} error={driveError} onClose={onClose} onConnect={onConnectDrive} onDisconnect={onDisconnectDrive} />
  if (dialog.type === 'manageProfile') return <ProfileManageDialog profile={profile} onClose={onClose} onDelete={onDeleteProfile} onRequestEdit={onRequestEditProfile} onRequestAddIncome={onRequestAddIncomeSource} />
  if (dialog.type === 'profile') return <ProfileDialog profile={profile} onClose={onClose} onSave={onSaveProfile} />
  if (dialog.type === 'manageIncomeSource') return <IncomeSourceManageDialog source={incomeSources.find(source => source.id === dialog.sourceId)} onClose={onClose} onDelete={onDeleteIncomeSource} onRequestEdit={onRequestEditIncomeSource} />
  if (dialog.type === 'incomeSource') return <IncomeSourceDialog source={incomeSources.find(source => source.id === dialog.sourceId)} onClose={onClose} onSave={onSaveIncomeSource} />
  if (dialog.type === 'annualTargets') return <AnnualTargetsDialog tree={tree} onClose={onClose} onSave={onSaveAnnualTargets} />
  if (dialog.type === 'importJson') return <ImportPlanDialog dialog={dialog} onClose={onClose} onImport={onImportData} />
  if (dialog.type === 'buffer') return <BufferDialog buffer={buffer} onClose={onClose} onSave={onSaveBuffer} />
  if (dialog.type === 'manage') return <ManageDialog node={findNode(tree, dialog.nodeId)} onClose={onClose} onDelete={onDeleteNode} onRequestEdit={onRequestEdit} onRequestAdd={onRequestAdd} />
  return <NodeDialog dialog={dialog} tree={tree} onClose={onClose} onSave={onSaveNode} onDelete={onDeleteNode} />
}
