import { formatMoney } from '../../lib/money'
import { colorForNode } from './nodePresentation'
import MobileTree from './MobileTree'
import TreeNodeCard from './TreeNodeCard'
import { roundedElbowPath } from './treeLayout'

function PersonNode({ profile, driveUser, point, worldWidth, worldHeight, driveSaved }) {
  if (!profile.visible) return null
  return <div className="energy-person" style={{ left: `${point.x / worldWidth * 100}%`, top: `${point.y / worldHeight * 100}%` }}>
    {driveSaved && <span className="drive-saved-pulse material-symbols-rounded" role="status" aria-label="Saved to Google Drive">cloud_done</span>}
    {driveUser?.photoLink
      ? <img className="person-avatar-image" src={driveUser.photoLink} alt="" />
      : <span className="person-disc material-symbols-rounded" aria-hidden="true">person</span>}
    <strong>{profile.name}</strong>
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

function FinanceNode({ monthlyOutcome, point, worldWidth, worldHeight }) {
  const label = monthlyOutcome < 0 ? 'over-planned this month' : 'available this month'
  return <div className="energy-source is-finance" style={{ left: `${point.x / worldWidth * 100}%`, top: `${point.y / worldHeight * 100}%` }}>
    <div className="energy-finance-root">
      <span className="energy-root-icon material-symbols-rounded" aria-hidden="true">account_balance_wallet</span>
    </div>
    <strong>Monthly plan</strong>
    <span>{formatMoney(monthlyOutcome)} <small>{label}</small></span>
  </div>
}

export default function TreeCanvas({ layout, mobile, path, collapsedPaths, profile, driveUser, driveSaved, incomeSources, tree, onManageIncomeSource, onNavigate, onInspect }) {
  if (mobile) {
    return <MobileTree
      monthlyOutcome={layout.monthlyOutcome}
      allocations={layout.allocations}
      expandAll={layout.expandAll}
      collapsedPaths={collapsedPaths}
      income={layout.income}
      incomeSources={incomeSources}
      path={path}
      tree={tree}
      onManageIncomeSource={onManageIncomeSource}
      onNavigate={onNavigate}
      onInspect={onInspect}
    />
  }
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
      className="energy-world amount-tree"
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
      <PersonNode profile={profile} driveUser={driveUser} point={layout.personPoint} worldWidth={layout.worldWidth} worldHeight={layout.height} driveSaved={driveSaved} />
      {incomeSources.map((source, index) => <IncomeSourceNode key={source.id} source={source} point={layout.incomeSourcePoints[index]} worldWidth={layout.worldWidth} worldHeight={layout.height} onManage={onManageIncomeSource} />)}
      <FinanceNode monthlyOutcome={layout.monthlyOutcome} point={layout.sourcePoint} worldWidth={layout.worldWidth} worldHeight={layout.height} />
      {layout.positionedColumns.flatMap((column, columnIndex) => column.items.map(entry => <TreeNodeCard
        key={entry.path.join('/')}
        entry={entry}
        isExpanded={layout.expandAll ? !collapsedPaths.has(entry.path.join('/')) : entry.path.every((id, index) => path[index] === id) && entry.path.length <= path.length}
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
