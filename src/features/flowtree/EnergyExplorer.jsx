import { useEffect, useMemo, useRef, useState } from 'react'
import { allocateEnergy, energyAtPath } from '../../domain/energyFlow'
import { findNode, findPath, pathToNode, sortTreeByMonthlyTotal, totalChildren } from '../../domain/flowTree'
import { formatMoney } from '../../lib/money'
import TreeCanvas from './TreeCanvas'
import TreeHeader from './TreeHeader'
import TreeStatus from './TreeStatus'
import LoansView from './LoansView'
import GoalsView from './GoalsView'
import RecurringPaymentsView from './RecurringPaymentsView'
import InvestmentsView from './InvestmentsView'
import GeneralLedgerView from './GeneralLedgerView'
import { createTreeLayout } from './treeLayout'
import { useElementSize } from './useElementSize'
import './EnergyExplorer.css'

const THEME_SESSION_KEY = 'flowtree-theme'
const MOBILE_BREAKPOINT = 760

function DriveSyncStatus({ status }) {
  const [showSaved, setShowSaved] = useState(false)
  const previousStatus = useRef(status)

  useEffect(() => {
    const saveCompleted = status === 'saved' && previousStatus.current !== 'saved'
    previousStatus.current = status
    if (!saveCompleted) return undefined
    setShowSaved(true)
    const timer = window.setTimeout(() => setShowSaved(false), 2400)
    return () => window.clearTimeout(timer)
  }, [status])

  if (!['saving', 'error'].includes(status) && !(status === 'saved' && showSaved)) return null
  const content = status === 'saving'
    ? ['sync', 'Saving to Google Drive…']
    : status === 'saved'
      ? ['cloud_done', 'Saved to Google Drive']
      : ['cloud_off', 'Google Drive save needs attention']
  return <div className={`drive-sync-status is-${status}`} role="status">
    <span className="material-symbols-rounded" aria-hidden="true">{content[0]}</span>
    <span>{content[1]}</span>
    {status === 'saved' && <button type="button" onClick={() => setShowSaved(false)} aria-label="Dismiss Google Drive saved notification">×</button>}
  </div>
}

function EmptyTreeState({ sinking, onReturnHome }) {
  return <div className="empty-tree-state">
    <span className="material-symbols-rounded" aria-hidden="true">{sinking ? 'savings' : 'account_tree'}</span>
    <strong>{sinking ? 'No sinking funds to preview' : 'No plan categories to preview'}</strong>
    <p>{sinking ? 'Add a yearly target with a future date, then return here to see its monthly set-aside.' : 'Add a category to start building your monthly plan.'}</p>
    <button type="button" onClick={onReturnHome}>Return to Home</button>
  </div>
}

function readTheme() {
  try {
    return window.sessionStorage.getItem(THEME_SESSION_KEY) === 'dark' ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

function annualTargetsOnly(nodes) {
  return nodes.flatMap(node => {
    const children = annualTargetsOnly(node.children || [])
    return node.period === 'year' || children.length ? [{ ...node, children }] : []
  })
}

function useMobileLayout() {
  const query = `(max-width: ${MOBILE_BREAKPOINT}px)`
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches)

  useEffect(() => {
    const mediaQuery = window.matchMedia(query)
    const update = () => setMatches(mediaQuery.matches)
    update()
    mediaQuery.addEventListener('change', update)
    return () => mediaQuery.removeEventListener('change', update)
  }, [query])

  return matches
}

function MobileHomeOutlook({ profile, driveUser, income, buffer, planned }) {
  const monthLabel = new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' }).format(new Date())
  const available = income - buffer - planned
  const hasIncome = income > 0
  const health = !hasIncome
    ? 'Set your monthly income to start planning this month.'
    : available < 0
      ? `Over-planned by ${formatMoney(Math.abs(available))} after your safety buffer.`
      : planned === 0
        ? 'No monthly targets are planned yet.'
        : `${Math.round(planned / income * 100)}% of this month’s income is planned after your safety buffer.`
  const availableLabel = available < 0 ? 'Over-planned' : 'Available'
  const availableIcon = available < 0 ? 'warning' : 'savings'

  return <header className="mobile-home-outlook">
    <div className="mobile-home-outlook-heading">
      <span className="mobile-home-outlook-title"><small><span className="material-symbols-rounded" aria-hidden="true">calendar_month</span>{monthLabel}</small><strong>Monthly outlook</strong></span>
      <span className="mobile-home-avatar" aria-label={driveUser?.displayName || profile.name}>
        {driveUser?.photoLink
          ? <img src={driveUser.photoLink} alt="" />
          : <span className="material-symbols-rounded" aria-hidden="true">person</span>}
      </span>
    </div>
    <div className="mobile-home-totals" aria-label="Monthly plan summary">
      <span><small><span className="material-symbols-rounded" aria-hidden="true">payments</span>Income</small><strong>{formatMoney(income)}</strong></span>
      <span><small><span className="material-symbols-rounded" aria-hidden="true">account_balance_wallet</span>Planned</small><strong>{formatMoney(planned)}</strong></span>
      <span className={available < 0 ? 'is-over' : 'is-available'}><small><span className="material-symbols-rounded" aria-hidden="true">{availableIcon}</span>{availableLabel}</small><strong>{formatMoney(available)}</strong></span>
    </div>
    <p className="mobile-home-outlook-health"><span className="material-symbols-rounded" aria-hidden="true">insights</span><span>{health}</span></p>
  </header>
}

export default function EnergyExplorer({ tree, path, onPathChange: setPath, profile, incomeSources, generalLedgers, salary, buffer, canUndo, canRedo, onUndo, onRedo, driveUser, driveStatus, driveError, driveConfigured, onManageIncomeSource, onConnectDrive, onDisconnectDrive, onEditJson, onManageNode, onSaveLoan, onDeleteLoan, onSaveGoal, onSaveRecurringPaymentDay, onSaveInvestment, onSaveGeneralLedger, onDeleteGeneralLedger, onSaveLedgerExpense, onDeleteLedgerEntry }) {
  const demo = false
  const [view, setView] = useState('home')
  const [loanFocusId, setLoanFocusId] = useState(null)
  const [goalFocusId, setGoalFocusId] = useState(null)
  const [theme, setTheme] = useState(readTheme)
  const [showDriveSaved, setShowDriveSaved] = useState(false)
  const previousDriveStatus = useRef(driveStatus)
  const [viewportRef, viewport, hasMeasuredViewport] = useElementSize()
  const isMobileLayout = useMobileLayout()
  const orderedTree = useMemo(() => sortTreeByMonthlyTotal(tree), [tree])
  const sinkingTree = useMemo(() => sortTreeByMonthlyTotal(annualTargetsOnly(tree)), [tree])
  const visibleTree = view === 'sinking' ? sinkingTree : orderedTree
  const loans = useMemo(() => {
    const debt = tree.find(node => node.id === 'obligations')
    const collectDebtItems = nodes => nodes.flatMap(node => [node, ...collectDebtItems(node.children || [])])
    return collectDebtItems(debt?.children || [])
  }, [tree])
  const goals = useMemo(() => tree.find(node => node.id === 'goals')?.children || [], [tree])
  const investments = useMemo(() => tree.find(node => node.id === 'growth')?.children || [], [tree])
  const expandAll = view === 'home' && !path.length
  const visibleTreeExpanded = expandAll
  const showProfileMarker = view === 'home' && (profile.visible || Boolean(driveUser?.photoLink))

  const income = demo ? Math.round(totalChildren(visibleTree) * .75 + buffer) : salary
  const planned = totalChildren(orderedTree)
  const monthlyOutcome = income - buffer - planned
  const showMobileHomeOutlook = view === 'home' && !path.length && !expandAll
  const flow = useMemo(() => allocateEnergy(visibleTree, Math.max(0, income - buffer)), [visibleTree, income, buffer])
  const currentNode = findPath(visibleTree, path)
  const currentFunding = energyAtPath(flow.allocations, path)
  const currentChildren = currentNode?.children || visibleTree
  const currentAllocations = currentFunding?.children || flow.allocations
  const nextFunding = currentChildren.length
    ? currentAllocations.find(item => item.target > item.allocated)
    : currentFunding?.target > currentFunding?.allocated ? currentFunding : null
  const nextName = currentChildren.find(item => item.id === nextFunding?.id)?.name || currentNode?.name
  const status = income <= 0
    ? 'Set your income to see which destinations your plan can fill.'
    : nextFunding
      ? `Next: ${nextName} needs ${formatMoney(nextFunding.target - nextFunding.allocated)}.`
      : 'Every monthly target in this view is filled.'
  const layout = useMemo(() => ({
    ...createTreeLayout({ tree: visibleTree, path, allocations: flow.allocations, expandAll: visibleTreeExpanded, viewport, incomeSourceCount: incomeSources.length, showPerson: showProfileMarker }),
    available: income - buffer,
    monthlyOutcome,
    income,
    allocations: flow.allocations,
    expandAll: visibleTreeExpanded,
  }), [visibleTree, path, flow.allocations, visibleTreeExpanded, viewport, income, buffer, monthlyOutcome, incomeSources.length, showProfileMarker])
  const breadcrumbs = path.map((_, index) => ({ path: path.slice(0, index + 1), node: findPath(visibleTree, path.slice(0, index + 1)) }))

  useEffect(() => {
    const completedSave = previousDriveStatus.current === 'saving' && driveStatus === 'saved'
    previousDriveStatus.current = driveStatus
    if (!completedSave) return undefined
    setShowDriveSaved(true)
    const timer = window.setTimeout(() => setShowDriveSaved(false), 1800)
    return () => window.clearTimeout(timer)
  }, [driveStatus])

  useEffect(() => {
    try {
      window.sessionStorage.setItem(THEME_SESSION_KEY, theme)
    } catch {
      // Theme preference is optional and must not block the planner.
    }
  }, [theme])

  useEffect(() => {
    if (!path.length || viewport.width >= 900 || !viewportRef.current) return
    const destination = [...viewportRef.current.querySelectorAll('[data-tree-path]')]
      .find(element => element.dataset.treePath === path.join('/'))
    if (!destination) return
    const canvas = viewportRef.current
    const targetBox = destination.getBoundingClientRect()
    const canvasBox = canvas.getBoundingClientRect()
    const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
    if (isMobileLayout) {
      canvas.scrollTo({ top: Math.max(0, canvas.scrollTop + targetBox.top - canvasBox.top - 16), behavior })
      return
    }
    const leftDelta = targetBox.left + targetBox.width / 2 - (canvasBox.left + canvasBox.width / 2)
    const topDelta = targetBox.top + targetBox.height / 2 - (canvasBox.top + canvasBox.height / 2)
    canvas.scrollBy({ left: leftDelta, top: topDelta, behavior })
  }, [path, isMobileLayout, viewport.width, viewportRef])

  useEffect(() => {
    if (!viewportRef.current) return undefined

    const canvas = viewportRef.current
    if (viewport.width >= 900) {
      canvas.scrollTo({ left: 0, top: 0, behavior: 'auto' })
      return undefined
    }

    if (isMobileLayout) {
      canvas.scrollTo({ left: 0, top: 0, behavior: 'auto' })
      return undefined
    }

    const frame = window.requestAnimationFrame(() => {
      const root = canvas.querySelector('.energy-source')
      if (!root) return

      const rootBox = root.getBoundingClientRect()
      const canvasBox = canvas.getBoundingClientRect()
      canvas.scrollTo({
        left: 0,
        top: Math.max(0, rootBox.top - canvasBox.top - (canvas.clientHeight - rootBox.height) / 2),
        behavior: 'auto',
      })
    })

    return () => window.cancelAnimationFrame(frame)
  }, [isMobileLayout, viewport.height, viewport.width, viewportRef])

  function navigate(nextPath) {
    setPath(current => nextPath.join('/') === current.join('/') ? current.slice(0, -1) : nextPath)
  }

  function returnToRoot() {
    setView('home')
    setPath([])
  }

  function showSinkingFunds() {
    setView('sinking')
    setPath([])
  }

  function showLoans() {
    setLoanFocusId(null)
    setView('loans')
    setPath([])
  }

  function inspectNode(nodeId) {
    const nodePath = pathToNode(tree, nodeId)
    const node = findNode(tree, nodeId)
    if (nodePath[0] === 'obligations') {
      setLoanFocusId(node?.loan ? nodeId : null)
      setView('loans')
      setPath([])
      return
    }
    if (nodePath[0] === 'goals') {
      setGoalFocusId(nodeId === 'goals' ? null : nodeId)
      setView('goals')
      setPath([])
      return
    }
    onManageNode(nodeId)
  }

  function showGoals() {
    setGoalFocusId(null)
    setView('goals')
    setPath([])
  }

  function showRecurringPayments() {
    setView('recurring')
    setPath([])
  }

  function showInvestments() {
    setView('investments')
    setPath([])
  }

  function showGeneralLedger() {
    setView('ledger')
    setPath([])
  }

  return <main className={`energy-home theme-${theme}`}>
    <TreeHeader
      breadcrumbs={breadcrumbs}
      expandAll={expandAll}
      view={view}
      profile={profile}
      onReturnToRoot={returnToRoot}
      onNavigate={setPath}
      driveUser={driveUser}
      driveStatus={driveStatus}
      driveError={driveError}
      driveConfigured={driveConfigured}
      theme={theme}
      onConnectDrive={onConnectDrive}
      onDisconnectDrive={onDisconnectDrive}
      onEditJson={onEditJson}
      onToggleTheme={() => setTheme(current => current === 'light' ? 'dark' : 'light')}
      onShowSinkingFunds={showSinkingFunds}
      onShowLoans={showLoans}
      onShowGoals={showGoals}
      onShowRecurringPayments={showRecurringPayments}
      onShowInvestments={showInvestments}
      onShowGeneralLedger={showGeneralLedger}
      canUndo={canUndo}
      canRedo={canRedo}
      onUndo={onUndo}
      onRedo={onRedo}
    />
    <DriveSyncStatus status={driveStatus} />
    {view === 'loans' ? <LoansView loans={loans} focusedLoanId={loanFocusId} onSaveLoan={onSaveLoan} onDeleteLoan={onDeleteLoan} /> : view === 'goals' ? <GoalsView goals={goals} focusedGoalId={goalFocusId} onSaveGoal={onSaveGoal} /> : view === 'recurring' ? <RecurringPaymentsView tree={tree} onSaveDay={onSaveRecurringPaymentDay} /> : view === 'investments' ? <InvestmentsView investments={investments} onSaveInvestment={onSaveInvestment} /> : view === 'ledger' ? <GeneralLedgerView ledgers={generalLedgers} onSaveLedger={onSaveGeneralLedger} onDeleteLedger={onDeleteGeneralLedger} onSaveExpense={onSaveLedgerExpense} onDeleteEntry={onDeleteLedgerEntry} /> : <><div ref={viewportRef} className={`energy-viewport${hasMeasuredViewport ? ' is-measured' : ''}${showMobileHomeOutlook ? ' has-mobile-home-outlook' : ''}`} tabIndex={0} role="region" aria-label="Interactive energy tree. Amounts are monthly targets.">
      {showMobileHomeOutlook && <MobileHomeOutlook profile={profile} driveUser={driveUser} income={income} buffer={buffer} planned={planned} />}
      {visibleTree.length
        ? <TreeCanvas
            layout={layout}
            mobile={isMobileLayout}
            path={path}
            profile={showProfileMarker ? profile : { ...profile, visible: false }}
            driveUser={driveUser}
            driveSaved={showDriveSaved}
            incomeSources={incomeSources}
            tree={visibleTree}
            onManageIncomeSource={onManageIncomeSource}
            onNavigate={navigate}
            onInspect={inspectNode}
          />
        : <EmptyTreeState sinking={view === 'sinking'} onReturnHome={returnToRoot} />}
    </div>
    <TreeStatus demo={demo} mobileHome={showMobileHomeOutlook} sinking={view === 'sinking'} flow={flow} available={layout.available} monthlyOutcome={monthlyOutcome} planned={planned} status={status} /></>}
  </main>
}
