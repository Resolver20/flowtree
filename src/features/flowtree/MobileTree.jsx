import { goalCardPreview } from './goalCardPreview'
import InactiveMarker from './InactiveMarker'
import MonthlyPlanShare from './MonthlyPlanShare'
import { monthlyPlanShare } from '../../domain/monthlyPlanShare'
import { annualTargetProgress } from '../../domain/flowTree'
import { formatMoney } from '../../lib/money'
import { colorForNode, iconForNode } from './nodePresentation'

const EMPTY_FUNDING = { allocated: 0, target: 0, ratio: 0 }

function MobileIncomeSource({ source, onManage }) {
  return <div className="mobile-income-source">
    <span className="material-symbols-rounded" aria-hidden="true">{source.icon || 'payments'}</span>
    <span><strong>{source.name}</strong><small>{formatMoney(source.amount)} /mo</small></span>
    <button type="button" onClick={() => onManage(source.id)} aria-label={`View and manage ${source.name}`}>
      <span className="material-symbols-rounded" aria-hidden="true">info</span>
    </button>
  </div>
}

function MobileIncomeSummary({ income, onInspectIncome }) {
  return <div className="mobile-income-source" aria-label={`Income, ${formatMoney(income)} per month`}>
    <span className="material-symbols-rounded" aria-hidden="true">payments</span>
    <span><strong>Income</strong><small>{formatMoney(income)} /mo</small></span>
    <button type="button" onClick={onInspectIncome} aria-label="View income information"><span className="material-symbols-rounded" aria-hidden="true">info</span></button>
  </div>
}

function MobileNode({ entry, tree, monthlyIncome, selectedPath, expandAll, collapsedPaths, onNavigate, onInspect }) {
  const { item, path } = entry
  const funding = entry.funding || EMPTY_FUNDING
  const hasChildren = Boolean(item.children?.length)
  const isSelected = path.join('/') === selectedPath.join('/')
  const showChildren = hasChildren && (expandAll ? !collapsedPaths.has(path.join('/')) : path.every((id, index) => selectedPath[index] === id))
  const annualProgress = annualTargetProgress(item)
  const color = colorForNode(item)
  const isGoal = path.includes('goals') && item.id !== 'goals'
  const { monthlyAmount, inactive } = goalCardPreview(item, isGoal, funding.target)
  const share = monthlyPlanShare({ amount: funding.target, income: monthlyIncome, tree, path })
  const targetText = annualProgress
    ? `${formatMoney(monthlyAmount)} per month, ${Math.round(annualProgress.ratio * 100)} percent of the ${isGoal ? 'goal' : 'annual'} target saved`
    : `${formatMoney(monthlyAmount)} per month`

  const content = <>
    <span className="mobile-tree-icon material-symbols-rounded" style={{ color }} aria-hidden="true">{iconForNode(item)}</span>
    <span className="mobile-tree-copy"><strong>{item.name}</strong><small>{targetText}</small></span>
    <MonthlyPlanShare label={share.label} />
    <InactiveMarker inactive={inactive} />
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

export default function MobileTree({ sinking = false, monthlyIncome, monthlyOutcome, allocations, expandAll, collapsedPaths, income, incomeSources, path, tree, onManageIncomeSource, onInspectIncome, onNavigate, onInspect, onInspectPlan }) {
  const availableLabel = 'remaining this month'
  const rootLabel = sinking ? 'Sinking funds' : 'Monthly plan'
  return <div className="mobile-tree" aria-label={`${rootLabel} flow`}>
    {!sinking && <><section className="mobile-tree-income" aria-label="Income">
      <span className="mobile-tree-step"><span>Income</span><button type="button" onClick={onInspectIncome} aria-label="View income information"><span className="material-symbols-rounded" aria-hidden="true">info</span><span>Info</span></button></span>
      {incomeSources.length
        ? incomeSources.map(source => <MobileIncomeSource key={source.id} source={source} onManage={onManageIncomeSource} />)
        : <MobileIncomeSummary income={income} onInspectIncome={onInspectIncome} />}
    </section>
    <div className="mobile-tree-connector" aria-hidden="true" /></>}
    <section className="mobile-plan-root" aria-label={rootLabel}>
      <span className="material-symbols-rounded" aria-hidden="true">account_balance_wallet</span>
      <span><strong>{rootLabel}</strong>{!sinking && <small>{formatMoney(monthlyOutcome)} {availableLabel}</small>}</span>
      {!sinking && <button type="button" className="mobile-tree-manage" onClick={onInspectPlan} aria-label="View monthly plan information"><span className="material-symbols-rounded" aria-hidden="true">info</span></button>}
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
