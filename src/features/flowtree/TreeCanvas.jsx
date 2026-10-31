import { formatMoney } from '../../lib/money'
import { colorForNode } from './nodePresentation'
import MobileTree from './MobileTree'
import MonthlyPlanHub from './MonthlyPlanHub'
import TreeNodeCard from './TreeNodeCard'
import { useId, useState } from 'react'

function IncomeSummaryNode({ income, point, worldWidth, worldHeight, driveSaved, onInspect, hasChildren, expanded, onToggle, childrenId }) {
  const Card = hasChildren ? 'button' : 'div'
  return <div className="income-source income-summary" style={{ left: `${point.x / worldWidth * 100}%`, top: `${point.y / worldHeight * 100}%` }}>
    {driveSaved && <span className="drive-saved-pulse material-symbols-rounded" role="status" aria-label="Saved to Google Drive">cloud_done</span>}
    <Card className="income-source-card" type={hasChildren ? 'button' : undefined} onClick={hasChildren ? onToggle : undefined} aria-expanded={hasChildren ? expanded : undefined} aria-controls={hasChildren ? childrenId : undefined} aria-label={`${hasChildren ? expanded ? 'Collapse ' : 'Show ' : ''}Income, ${formatMoney(income)} per month`}>
      <span className="material-symbols-rounded" aria-hidden="true">payments</span>
      <span className="income-source-copy"><strong>Income</strong><small>{formatMoney(income)} /mo</small></span>
      {hasChildren && <span className="income-expand-cue material-symbols-rounded" aria-hidden="true">{expanded ? 'expand_less' : 'expand_more'}</span>}
    </Card>
    <button type="button" className="card-info" onClick={onInspect} aria-label="View income information" title="View income information"><span className="material-symbols-rounded" aria-hidden="true">info</span></button>
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

function FinanceNode({ sinking, monthlyOutcome, monthlyDeductions, point, worldWidth, worldHeight, onInspectPlan }) {
  return <div className={`energy-source is-finance${sinking ? '' : ' is-monthly-plan'}`} style={{ left: `${point.x / worldWidth * 100}%`, top: `${point.y / worldHeight * 100}%` }}>
    {sinking ? <>
    <div className="energy-finance-root">
      <span className="energy-root-icon material-symbols-rounded" aria-hidden="true">account_balance_wallet</span>
    </div>
    <strong>Sinking funds</strong>
    </> : <MonthlyPlanHub monthlyDeductions={monthlyDeductions} monthlyOutcome={monthlyOutcome} onInspectPlan={onInspectPlan} />}
  </div>
}

export default function TreeCanvas({ sinking = false, layout, monthlyIncome, monthlyDeductions, mobile, path, collapsedPaths, driveSaved, incomeSources, tree, onManageIncomeSource, onNavigate, onInspect, onInspectPlan, onInspectIncome }) {
  const [incomeExpanded, setIncomeExpanded] = useState(true)
  const incomeChildrenId = useId()
  const toggleIncome = () => setIncomeExpanded(expanded => !expanded)
  if (mobile) {
    return <MobileTree
      incomeExpanded={incomeExpanded}
      onToggleIncome={toggleIncome}
      sinking={sinking}
      monthlyIncome={monthlyIncome}
      monthlyOutcome={layout.monthlyOutcome}
      monthlyDeductions={monthlyDeductions}
      allocations={layout.allocations}
      expandAll={layout.expandAll}
      collapsedPaths={collapsedPaths}
      income={layout.income}
      incomeSources={incomeSources}
      path={path}
      tree={tree}
      onManageIncomeSource={onManageIncomeSource}
      onInspectIncome={onInspectIncome}
      onNavigate={onNavigate}
      onInspect={onInspect}
      onInspectPlan={onInspectPlan}
    />
  }
  const rootById = new Map(tree.map(item => [item.id, item]))

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
        {layout.introPaths.filter((_, index) => index === 0 || incomeExpanded).map((d, index) => <path key={`intro-${index}`} className="energy-track intro-track" d={d} />)}
        {layout.connectorGroups.map(group => <path
          key={group.key}
          className="energy-track"
          d={group.d}
          style={{ '--branch-color': group.columnIndex === 0 ? '#9da7b6' : colorForNode(rootById.get(group.rootId)) }}
        />)}
      </svg>
      {!sinking && <IncomeSummaryNode income={monthlyIncome} point={layout.personPoint} worldWidth={layout.worldWidth} worldHeight={layout.height} driveSaved={driveSaved} onInspect={onInspectIncome} hasChildren={incomeSources.length > 0} expanded={incomeExpanded} onToggle={toggleIncome} childrenId={incomeChildrenId} />}
      {!sinking && incomeSources.length > 0 && <div id={incomeChildrenId} role="group" aria-label="Income sources" hidden={!incomeExpanded}>
        {incomeSources.map((source, index) => <IncomeSourceNode key={source.id} source={source} point={layout.incomeSourcePoints[index]} worldWidth={layout.worldWidth} worldHeight={layout.height} onManage={onManageIncomeSource} />)}
      </div>}
        <FinanceNode sinking={sinking} monthlyOutcome={layout.monthlyOutcome} monthlyDeductions={monthlyDeductions} point={layout.sourcePoint} worldWidth={layout.worldWidth} worldHeight={layout.height} onInspectPlan={onInspectPlan} />
      {layout.positionedColumns.flatMap((column, columnIndex) => column.items.map(entry => <TreeNodeCard
        key={entry.path.join('/')}
        entry={entry}
        tree={tree}
        monthlyIncome={monthlyIncome}
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
