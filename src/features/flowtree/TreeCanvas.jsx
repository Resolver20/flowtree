import { formatMoney } from '../../lib/money'
import { colorForNode } from './nodePresentation'
import TreeNodeCard from './TreeNodeCard'
import { roundedElbowPath } from './treeLayout'

function PersonNode({ profile, point, worldWidth, worldHeight, onManage }) {
  if (!profile.visible) return null
  return <div className="energy-person" style={{ left: `${point.x / worldWidth * 100}%`, top: `${point.y / worldHeight * 100}%` }}>
    <span className="person-disc material-symbols-rounded" aria-hidden="true">person</span>
    <strong>{profile.name}</strong>
    <button type="button" className="card-info" onClick={onManage} aria-label={`View and manage ${profile.name}`} title={`View and manage ${profile.name}`}><span className="material-symbols-rounded" aria-hidden="true">info</span></button>
  </div>
}

function IncomeSourceNode({ source, point, worldWidth, worldHeight, onManage }) {
  return <div className="income-source" style={{ left: `${point.x / worldWidth * 100}%`, top: `${point.y / worldHeight * 100}%` }}>
    <div className="income-source-card" title={`${source.name}: ${formatMoney(source.amount)} per month`}>
      <span className="material-symbols-rounded" aria-hidden="true">{source.icon || 'payments'}</span>
      <span><strong>{source.name}</strong><small>{formatMoney(source.amount)} /mo</small></span>
    </div>
    <button type="button" className="card-info" onClick={() => onManage(source.id)} aria-label={`View and manage ${source.name}`} title={`View and manage ${source.name}`}><span className="material-symbols-rounded" aria-hidden="true">info</span></button>
  </div>
}

function FinanceNode({ available, isOpen, onToggle, point, worldWidth, worldHeight }) {
  return <div className={`energy-source is-finance ${isOpen ? 'is-open' : ''}`} style={{ left: `${point.x / worldWidth * 100}%`, top: `${point.y / worldHeight * 100}%` }}>
    <button className="energy-finance-toggle" type="button" onClick={onToggle} aria-expanded={isOpen} aria-label={`${isOpen ? 'Close' : 'Open'} monthly plan`} title={`${isOpen ? 'Close' : 'Open'} monthly plan`}>
      <span className="energy-root-icon material-symbols-rounded" aria-hidden="true">account_balance_wallet</span>
      <span className="plan-toggle-cue material-symbols-rounded" aria-hidden="true">expand_more</span>
    </button>
    <strong>Monthly plan</strong>
    <span>{formatMoney(available)} <small>available</small></span>
  </div>
}

export default function TreeCanvas({ layout, isTransitioning, planOpen, onTogglePlan, path, profile, incomeSources, tree, onManageIncomeSource, onManageProfile, onNavigate, onInspect }) {
  const rootById = new Map(tree.map(item => [item.id, item]))
  const introPaths = [
    ...layout.incomeSourcePoints.map(point => roundedElbowPath(
      { x: point.x + 98, y: point.y },
      { x: layout.sourcePoint.x - 36, y: layout.sourcePoint.y },
    )),
    ...(profile.visible
      ? layout.incomeSourcePoints.length
        ? layout.incomeSourcePoints.map(point => roundedElbowPath(
          { x: layout.personPoint.x + 36, y: layout.personPoint.y },
          { x: point.x - 98, y: point.y },
        ))
        : [roundedElbowPath(
          { x: layout.personPoint.x + 36, y: layout.personPoint.y },
          { x: layout.sourcePoint.x - 36, y: layout.sourcePoint.y },
        )]
      : []),
  ]

  return <div
    className="energy-world-frame"
    style={{
      width: layout.worldWidth * layout.scale,
      height: layout.height * layout.scale,
    }}
  >
    <div
      className={`energy-world amount-tree${isTransitioning ? ' is-transitioning' : ''}`}
      style={{
        width: layout.worldWidth,
        height: layout.height,
        transform: `scale(${layout.scale})`,
      }}
    >
      <svg className="energy-connections" viewBox={`0 0 ${layout.worldWidth} ${layout.height}`} preserveAspectRatio="none" aria-hidden="true">
        {introPaths.map((d, index) => <path key={`intro-${index}`} className="energy-track intro-track" d={d} />)}
        {layout.connectorGroups.map(group => <path
          key={group.key}
          className="energy-track"
          d={group.d}
          style={{ '--branch-color': group.columnIndex === 0 ? '#9da7b6' : colorForNode(rootById.get(group.rootId)) }}
        />)}
      </svg>
      <PersonNode profile={profile} point={layout.personPoint} worldWidth={layout.worldWidth} worldHeight={layout.height} onManage={onManageProfile} />
      {incomeSources.map((source, index) => <IncomeSourceNode key={source.id} source={source} point={layout.incomeSourcePoints[index]} worldWidth={layout.worldWidth} worldHeight={layout.height} onManage={onManageIncomeSource} />)}
      <FinanceNode available={layout.available} isOpen={planOpen} onToggle={onTogglePlan} point={layout.sourcePoint} worldWidth={layout.worldWidth} worldHeight={layout.height} />
      {layout.positionedColumns.flatMap((column, columnIndex) => column.items.map(entry => <TreeNodeCard
        key={entry.path.join('/')}
        entry={entry}
        isExpanded={entry.path.every((id, index) => path[index] === id) && entry.path.length <= path.length}
        isSelected={entry.path.join('/') === path.join('/')}
        isCategory={columnIndex === 0}
        worldWidth={layout.worldWidth}
        worldHeight={layout.height}
        onNavigate={onNavigate}
        onInspect={onInspect}
      />))}
    </div>
  </div>
}
