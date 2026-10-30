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

function MobileIncomeSummary({ income }) {
  return <div className="mobile-income-source" aria-label={`Income, ${formatMoney(income)} per month`}>
    <span className="material-symbols-rounded" aria-hidden="true">payments</span>
    <span><strong>Income</strong><small>{formatMoney(income)} /mo</small></span>
  </div>
}

function MobileNode({ entry, selectedPath, expandAll, onNavigate, onInspect }) {
  const { item, path } = entry
  const funding = entry.funding || EMPTY_FUNDING
  const hasChildren = Boolean(item.children?.length)
  const isSelected = path.join('/') === selectedPath.join('/')
  const showChildren = hasChildren && (expandAll || path.every((id, index) => selectedPath[index] === id))
  const annualProgress = annualTargetProgress(item)
  const color = colorForNode(item)
  const targetText = annualProgress
    ? `${formatMoney(funding.target)} per month, ${Math.round(annualProgress.ratio * 100)} percent of the annual target saved`
    : `${formatMoney(funding.target)} per month`

  const content = <>
    <span className="mobile-tree-icon material-symbols-rounded" style={{ color }} aria-hidden="true">{iconForNode(item)}</span>
    <span className="mobile-tree-copy"><strong>{item.name}</strong><small>{targetText}</small></span>
    {hasChildren && <span className="mobile-tree-cue material-symbols-rounded" aria-hidden="true">{showChildren ? 'expand_less' : 'expand_more'}</span>}
  </>

  return <div className={`mobile-tree-node${isSelected ? ' is-selected' : ''}${showChildren ? ' is-expanded' : ''}`} data-tree-path={path.join('/')}>
    <div className="mobile-tree-node-row">
      {hasChildren
        ? <button type="button" className="mobile-tree-card" onClick={() => onNavigate(path)} aria-expanded={showChildren} aria-label={`${showChildren ? 'Collapse' : 'Show'} ${item.name}, ${targetText}`}>{content}</button>
        : <div className="mobile-tree-card" aria-label={`${item.name}, ${targetText}`}>{content}</div>}
      <button type="button" className="mobile-tree-manage" onClick={() => onInspect(item.id)} aria-label={`View and manage ${item.name}`}>
        <span className="material-symbols-rounded" aria-hidden="true">info</span>
      </button>
    </div>
    {showChildren && <div className="mobile-tree-children">
      {item.children.map((child, index) => <MobileNode
        key={child.id}
        entry={{ item: child, path: [...path, child.id], funding: funding.children?.[index] || EMPTY_FUNDING }}
        selectedPath={selectedPath}
        expandAll={expandAll}
        onNavigate={onNavigate}
        onInspect={onInspect}
      />)}
    </div>}
  </div>
}

export default function MobileTree({ monthlyOutcome, allocations, expandAll, income, incomeSources, path, tree, onManageIncomeSource, onNavigate, onInspect }) {
  const availableLabel = monthlyOutcome < 0 ? 'over-planned this month' : 'available this month'
  return <div className="mobile-tree" aria-label="Monthly plan flow">
    <section className="mobile-tree-income" aria-label="Income">
      <span className="mobile-tree-step">Income</span>
      {incomeSources.length
        ? incomeSources.map(source => <MobileIncomeSource key={source.id} source={source} onManage={onManageIncomeSource} />)
        : <MobileIncomeSummary income={income} />}
    </section>
    <div className="mobile-tree-connector" aria-hidden="true" />
    <section className="mobile-plan-root" aria-label="Monthly plan">
      <span className="material-symbols-rounded" aria-hidden="true">account_balance_wallet</span>
      <span><strong>Monthly plan</strong><small>{formatMoney(monthlyOutcome)} {availableLabel}</small></span>
    </section>
    <div className="mobile-tree-connector" aria-hidden="true" />
    <section className="mobile-tree-categories" aria-label="Plan categories">
      <span className="mobile-tree-step">Categories</span>
      {tree.map((item, index) => <MobileNode
        key={item.id}
        entry={{ item, path: [item.id], funding: allocations[index] || EMPTY_FUNDING }}
        selectedPath={path}
        expandAll={expandAll}
        onNavigate={onNavigate}
        onInspect={onInspect}
      />)}
    </section>
  </div>
}
