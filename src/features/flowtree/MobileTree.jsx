import { cardProgress } from '../../domain/cardProgress'
import { goalCardPreview } from './goalCardPreview'
import { useId, useState } from 'react'
import InactiveMarker from './InactiveMarker'
import MonthlyPlanShare from './MonthlyPlanShare'
import MonthlyPlanHub from './MonthlyPlanHub'
import { monthlyPlanShare } from '../../domain/monthlyPlanShare'
import { formatMoney } from '../../lib/money'
import { colorForNode, iconForNode } from './nodePresentation'

const EMPTY_FUNDING = { allocated: 0, target: 0, ratio: 0 }

function MobileIncomeSource({ source, onManage }) {
  return <div className="mobile-tree-node-row mobile-income-child">
    <div className="mobile-income-source">
    <span className="material-symbols-rounded" aria-hidden="true">{source.icon || 'payments'}</span>
    <span><strong>{source.name}</strong><small>{formatMoney(source.amount)} /mo</small></span>
    </div>
    <button type="button" className="mobile-tree-manage" onClick={() => onManage(source.id)} aria-label={`View and manage ${source.name}`}>
      <span className="material-symbols-rounded" aria-hidden="true">info</span>
    </button>
  </div>
}

function MobileIncomeSummary({ income, onInspectIncome, hasChildren, expanded, onToggle, childrenId }) {
  const content = <>
    <span className="material-symbols-rounded" aria-hidden="true">payments</span>
    <span><strong>Income</strong><small>{formatMoney(income)} /mo</small></span>
    {hasChildren && <span className="mobile-tree-cue material-symbols-rounded" aria-hidden="true">{expanded ? 'expand_less' : 'expand_more'}</span>}
  </>
  return <div className="mobile-tree-node-row mobile-income-root">
    {hasChildren
      ? <button type="button" className="mobile-income-source" onClick={onToggle} aria-expanded={expanded} aria-controls={childrenId} aria-label={`${expanded ? 'Collapse' : 'Show'} Income, ${formatMoney(income)} per month`}>{content}</button>
      : <div className="mobile-income-source" aria-label={`Income, ${formatMoney(income)} per month`}>{content}</div>}
    <button type="button" className="mobile-tree-manage" onClick={onInspectIncome} aria-label="View income information"><span className="material-symbols-rounded" aria-hidden="true">info</span></button>
  </div>
}

function MobileNode({ entry, tree, monthlyIncome, selectedPath, expandAll, collapsedPaths, onNavigate, onInspect }) {
  const { item, path } = entry
  const funding = entry.funding || EMPTY_FUNDING
  const hasChildren = Boolean(item.children?.length)
  const isSelected = path.join('/') === selectedPath.join('/')
  const showChildren = hasChildren && (expandAll ? !collapsedPaths.has(path.join('/')) : path.every((id, index) => selectedPath[index] === id))
  const progress = cardProgress(item, funding)
  const color = colorForNode(item)
  const isGoal = path.includes('goals') && item.id !== 'goals'
  const { monthlyAmount, inactive } = goalCardPreview(item, isGoal, funding.target)
  const share = monthlyPlanShare({ amount: funding.target, income: monthlyIncome, tree, path })
  const targetText = `${formatMoney(monthlyAmount)} per month, ${Math.round(progress.ratio * 100)} percent ${progress.label}`

  const content = <>
    <span className="mobile-tree-icon material-symbols-rounded" style={{ color }} aria-hidden="true">{iconForNode(item)}</span>
    <span className="mobile-tree-copy"><strong>{item.name}</strong><small>{formatMoney(monthlyAmount)} per month</small></span>
    <MonthlyPlanShare label={share.label} />
    <InactiveMarker inactive={inactive} />
    {<span className="node-progress" style={{ '--progress-color': color }} aria-hidden="true"><span style={{ width: `${progress.ratio * 100}%` }} /></span>}
    {hasChildren && <span className="mobile-tree-cue material-symbols-rounded" aria-hidden="true">{showChildren ? 'expand_less' : 'expand_more'}</span>}
  </>

  return <div className={`mobile-tree-node${isSelected ? ' is-selected' : ''}${showChildren ? ' is-expanded' : ''}`} data-tree-path={path.join('/')}>
    <div className="mobile-tree-node-row">
      {hasChildren
        ? <button type="button" className="mobile-tree-card" onClick={() => onNavigate(path)} aria-expanded={showChildren} aria-label={`${showChildren ? 'Collapse' : 'Show'} ${item.name}, ${targetText}, ${share.label} of monthly income${inactive ? ', Inactive — excluded from monthly allocation' : ''}`}>{content}</button>
        : <div className="mobile-tree-card" aria-label={`${item.name}, ${targetText}, ${share.label} of monthly income${inactive ? ', Inactive — excluded from monthly allocation' : ''}`}>{content}</div>}
      <button type="button" className="mobile-tree-manage" onClick={() => onInspect(item.id)} aria-label={`View and manage ${item.name}`}>
        <span className="material-symbols-rounded" aria-hidden="true">info</span>
      </button>
    </div>
    {showChildren && <div className="mobile-tree-children">
      {item.children.map((child, index) => <MobileNode
        key={child.id}
        entry={{ item: child, path: [...path, child.id], funding: funding.children?.[index] || EMPTY_FUNDING }}
        tree={tree}
        monthlyIncome={monthlyIncome}
        selectedPath={selectedPath}
        expandAll={expandAll}
        collapsedPaths={collapsedPaths}
        onNavigate={onNavigate}
        onInspect={onInspect}
      />)}
    </div>}
  </div>
}

export default function MobileTree({ sinking = false, monthlyIncome, monthlyOutcome, monthlyDeductions, allocations, expandAll, collapsedPaths, income, incomeSources, path, tree, onManageIncomeSource, onInspectIncome, onNavigate, onInspect, onInspectPlan, incomeExpanded: sharedIncomeExpanded, onToggleIncome }) {
  const [localIncomeExpanded, setLocalIncomeExpanded] = useState(true)
  const incomeExpanded = sharedIncomeExpanded ?? localIncomeExpanded
  const incomeChildrenId = useId()
  const rootLabel = sinking ? 'Sinking funds' : 'Monthly plan'
  return <div className="mobile-tree" aria-label={`${rootLabel} flow`}>
    {!sinking && <><section className="mobile-tree-income" aria-label="Income">
      <MobileIncomeSummary income={income} onInspectIncome={onInspectIncome} hasChildren={incomeSources.length > 0} expanded={incomeExpanded} onToggle={onToggleIncome || (() => setLocalIncomeExpanded(expanded => !expanded))} childrenId={incomeChildrenId} />
      {incomeSources.length > 0 && <div id={incomeChildrenId} className="mobile-income-children" role="group" aria-label="Income sources" hidden={!incomeExpanded}>
        {incomeSources.map(source => <MobileIncomeSource key={source.id} source={source} onManage={onManageIncomeSource} />)}
      </div>}
    </section>
    <div className="mobile-tree-connector" aria-hidden="true" /></>}
    <section className={`mobile-plan-root${!sinking ? ' is-monthly-plan' : ''}`} aria-label={rootLabel}>
      {sinking ? <><span className="material-symbols-rounded" aria-hidden="true">account_balance_wallet</span><div className="mobile-plan-copy"><strong>{rootLabel}</strong></div></> : <MonthlyPlanHub monthlyDeductions={monthlyDeductions} monthlyOutcome={monthlyOutcome} onInspectPlan={onInspectPlan} />}
    </section>
    <div className="mobile-tree-connector" aria-hidden="true" />
    <section className="mobile-tree-categories" aria-label="Plan categories">
      <span className="mobile-tree-step">Categories</span>
      {tree.map((item, index) => <MobileNode
        key={item.id}
        entry={{ item, path: [item.id], funding: allocations[index] || EMPTY_FUNDING }}
        tree={tree}
        monthlyIncome={monthlyIncome}
        selectedPath={path}
        expandAll={expandAll}
        collapsedPaths={collapsedPaths}
        onNavigate={onNavigate}
        onInspect={onInspect}
      />)}
    </section>
  </div>
}
