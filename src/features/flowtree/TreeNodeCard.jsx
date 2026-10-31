import { goalCardPreview } from './goalCardPreview'
import { monthlyPlanShare } from '../../domain/monthlyPlanShare'
import MonthlyPlanShare from './MonthlyPlanShare'
import InactiveMarker from './InactiveMarker'
import { formatMoney } from '../../lib/money'
import { annualTargetProgress } from '../../domain/flowTree'
import { goalSavingsPlan } from '../../domain/goalSavingsPlan'
import { colorForNode, iconForNode } from './nodePresentation'

export default function TreeNodeCard({ entry, tree, monthlyIncome, isExpanded, isSelected, isCategory, worldWidth, worldHeight, onNavigate, onInspect }) {
  const { item, funding, path, point } = entry
  const hasChildren = Boolean(item.children?.length)
  const complete = funding.target > 0 && funding.ratio >= 1
  const action = isExpanded ? 'Collapse to' : 'Show'
  const annualProgress = annualTargetProgress(item)
  const color = colorForNode(item)
  const isLifeGoal = path.includes('goals') && item.id !== 'goals'
  const { monthlyAmount, inactive } = goalCardPreview(item, isLifeGoal, funding.target)
  const share = monthlyPlanShare({ amount: funding.target, income: monthlyIncome, tree, path })
  const progressText = annualProgress
    ? `${formatMoney(annualProgress.saved)} ${isLifeGoal ? 'planned accumulated of' : 'expected saved of'} ${formatMoney(annualProgress.target)} ${isLifeGoal ? 'goal target' : 'annual target'}`
    : `${formatMoney(funding.allocated)} funded of ${formatMoney(funding.target)} monthly target`

  const targetText = `${progressText}, ${share.label} of monthly income${isLifeGoal ? `, ${formatMoney(goalSavingsPlan(item).remaining)} still to save, ${formatMoney(monthlyAmount)} per month estimate` : ''}${inactive ? ', Inactive — excluded from monthly allocation' : ''}`

  const cardContent = <>
    <span className="amount-icon material-symbols-rounded" style={{ color }} aria-hidden="true">{iconForNode(item)}</span>
    <span className="amount-copy"><strong>{item.name}</strong>{annualProgress
      ? <><span className="amount-number">{formatMoney(monthlyAmount)}<small> /mo</small></span><span className="target-meta">{formatMoney(annualProgress.saved)} / {formatMoney(annualProgress.target)} · {Math.round(annualProgress.ratio * 100)}%</span></>
      : <span className="amount-number">{formatMoney(monthlyAmount)}<small> /mo</small></span>}
    </span>
    <MonthlyPlanShare label={share.label} />
    <InactiveMarker inactive={inactive} />
    {annualProgress && <span className="node-progress" style={{ '--progress-color': color }} aria-hidden="true"><span style={{ width: `${annualProgress.ratio * 100}%` }} /></span>}
    {hasChildren && !isExpanded && <span className="branch-cue material-symbols-rounded" aria-hidden="true">chevron_right</span>}
  </>

  return <div
    className={`energy-destination ${isCategory ? `energy-category category-${item.id}` : 'energy-child'} ${hasChildren ? 'has-children' : 'is-leaf'} ${isExpanded ? 'is-expanded' : ''} ${isSelected ? 'is-selected' : ''} ${complete ? 'is-filled' : ''}`}
    data-tree-path={path.join('/')}
    style={{ left: `${point.x / worldWidth * 100}%`, top: `${point.y / worldHeight * 100}%` }}
  >
    {hasChildren
      ? <button className="amount-node" type="button" onClick={() => onNavigate(path)} title={`${item.name}: ${targetText}`} aria-label={`${action} ${item.name}, ${targetText}, ${Math.round((annualProgress?.ratio ?? funding.ratio) * 100)} percent filled`}>{cardContent}</button>
      : <div className="amount-node" title={`${item.name}: ${targetText}. End of branch.`}>{cardContent}</div>}
    <button type="button" className="card-info" style={{ color }} onClick={event => { event.stopPropagation(); onInspect(item.id) }} aria-label={`View and manage ${item.name}`} title={`View and manage ${item.name}`}><span className="material-symbols-rounded" aria-hidden="true">info</span></button>
  </div>
}
