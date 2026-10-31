import useSectionTransition from './useSectionTransition'
import { selectSinkingFunds } from '../../domain/sinkingFunds'
import { useEffect, useMemo, useRef, useState } from 'react'
import { allocateEnergy } from '../../domain/energyFlow'
import { toggleBranch } from '../../domain/treeExpansion'
import { findPath, sortTreeByMonthlyTotal, totalChildren } from '../../domain/flowTree'
import { formatMoney } from '../../lib/money'
import TreeCanvas from './TreeCanvas'
import TreeHeader from './TreeHeader'
import SinkingFundsSummary from './SinkingFundsSummary'
import LoansView from './LoansView'
import GoalsView from './GoalsView'
import RecurringPaymentsView from './RecurringPaymentsView'
import InvestmentsView from './InvestmentsView'
import GeneralLedgerView from './GeneralLedgerView'
import { createTreeLayout } from './treeLayout'
import { useElementSize } from './useElementSize'
import { useSectionScroll } from '../../hooks/useSectionScroll'
import { useCanvasControls } from './useCanvasControls'
import CanvasControls from './CanvasControls'
import './EnergyExplorer.css'

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
      ? `Available after deductions and safety buffer: ${formatMoney(available)}.`
      : planned === 0
        ? 'No monthly targets are planned yet.'
        : `${Math.round(planned / income * 100)}% of this month’s income is planned after your safety buffer.`
  const availableLabel = 'Available'
  const availableIcon = 'account_balance_wallet'

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
      <span className="is-deductions"><small><span className="material-symbols-rounded" aria-hidden="true">account_balance_wallet</span>Deductions</small><strong>{formatMoney(planned)}</strong></span>
      <span className="is-remaining"><small><span className="material-symbols-rounded" aria-hidden="true">{availableIcon}</span>{availableLabel}</small><strong>{formatMoney(available)}</strong></span>
    </div>
    <p className="mobile-home-outlook-health"><span className="material-symbols-rounded" aria-hidden="true">insights</span><span>{health}</span></p>
  </header>
}

export default function EnergyExplorer({ isExample = false, theme, onToggleTheme, view, focusedNodeId, onChangeView, monthlyHistory, hasUnsavedChanges, onDownloadBackup, tree, path: unpinnedPath, onPathChange: setPath, profile, incomeSources, generalLedgers, canvasPins, onChangeCanvasPin, salary, buffer, canUndo, canRedo, onUndo, onRedo, driveUser, driveStatus, driveError, driveConfigured, onManageIncomeSource, onInspectIncome, onInspectPlan, onConnectDrive, onDisconnectDrive, onSaveDrivePlan, onEditJson, onRecoverDriveVersion, onManageNode, onSaveLoan, onDeleteLoan, onSaveGoal, onSaveInvestment, onSaveGeneralLedger, onDeleteGeneralLedger, onSaveLedgerExpense, onDeleteLedgerEntry }) {
  const sectionRef = useSectionScroll(view)
  useSectionTransition(sectionRef, view)
  const demo = false
  const isMobileLayout = useMobileLayout()
  const pin = isMobileLayout ? undefined : canvasPins?.[view]
  const path = pin?.path || unpinnedPath
  const [localCollapsedPaths, setCollapsedPaths] = useState(() => new Set(pin?.collapsedPaths || []))
  const collapsedPaths = useMemo(() => pin ? new Set(pin.collapsedPaths) : localCollapsedPaths, [pin, localCollapsedPaths])
  const [showDriveSaved, setShowDriveSaved] = useState(false)
  const previousDriveStatus = useRef(driveStatus)
  const [viewportRef, viewport, hasMeasuredViewport] = useElementSize()
  const canvasControls = useCanvasControls(viewportRef, view, pin, snapshot => {
    if (!snapshot && pin) {
      setPath([...pin.path])
      setCollapsedPaths(new Set(pin.collapsedPaths))
    }
    onChangeCanvasPin(view, snapshot ? { ...snapshot, path: [...path], collapsedPaths: [...collapsedPaths] } : null)
  }, !isMobileLayout)
  const { isLocked } = canvasControls
  const orderedTree = useMemo(() => sortTreeByMonthlyTotal(tree), [tree])
  const sinkingTree = useMemo(() => selectSinkingFunds(orderedTree), [orderedTree])
  const visibleTree = view === 'sinking' ? sinkingTree : orderedTree
  const loans = useMemo(() => {
    const debt = tree.find(node => node.id === 'obligations')
    const collectDebtItems = nodes => nodes.flatMap(node => [node, ...collectDebtItems(node.children || [])])
    return collectDebtItems(debt?.children || [])
  }, [tree])
  const goals = useMemo(() => {
    const collect = nodes => nodes.flatMap(node => [node, ...collect(node.children || [])])
    return collect(tree.find(node => node.id === 'goals')?.children || [])
  }, [tree])
  const investments = useMemo(() => tree.find(node => node.id === 'growth')?.children || [], [tree])
  const expandAll = view === 'home' && !path.length
  const visibleTreeExpanded = expandAll || view === 'sinking'
  const showIncomeSummary = view === 'home'

  const income = demo ? Math.round(totalChildren(visibleTree) * .75 + buffer) : salary
  const planned = totalChildren(orderedTree)
  const monthlyOutcome = income - buffer - planned
  const showMobileHomeOutlook = view === 'home' && !path.length && !expandAll
  const flow = useMemo(() => allocateEnergy(visibleTree, Math.max(0, income - buffer)), [visibleTree, income, buffer])
  const layout = useMemo(() => ({
    ...createTreeLayout({ tree: visibleTree, path, allocations: flow.allocations, expandAll: visibleTreeExpanded, collapsedPaths, incomeSourceCount: view === 'sinking' ? 0 : incomeSources.length, showPerson: showIncomeSummary }),
    available: income - buffer,
    monthlyOutcome,
    income,
    allocations: flow.allocations,
    expandAll: visibleTreeExpanded,
  }), [visibleTree, path, flow.allocations, visibleTreeExpanded, collapsedPaths, income, buffer, monthlyOutcome, incomeSources.length, showIncomeSummary, view])
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
    if (isLocked() || !viewportRef.current) return undefined

    const canvas = viewportRef.current
    if (view === 'sinking' || viewport.width >= 900) {
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
  }, [view, isMobileLayout, viewport.height, viewport.width, viewportRef, isLocked])

  function navigate(nextPath) {
    if (pin) {
      if (visibleTreeExpanded) {
        onChangeCanvasPin(view, { ...pin, collapsedPaths: [...toggleBranch(visibleTree, collapsedPaths, nextPath)] })
      } else {
        onChangeCanvasPin(view, { ...pin, path: nextPath.join('/') === path.join('/') ? path.slice(0, -1) : nextPath })
      }
      return
    }
    if (visibleTreeExpanded) {
      setCollapsedPaths(current => toggleBranch(visibleTree, current, nextPath))
      return
    }
    setPath(current => nextPath.join('/') === current.join('/') ? current.slice(0, -1) : nextPath)
  }

  function returnToRoot() {
    onChangeView('home')
    setPath([])
  }

  function showSinkingFunds() {
    onChangeView('sinking')
    setPath([])
  }

  function showLoans() {
    onChangeView('loans')
    setPath([])
  }

  function inspectNode(nodeId) {
    onManageNode(nodeId)
  }

  function showGoals() {
    onChangeView('goals')
    setPath([])
  }

  function showRecurringPayments() {
    onChangeView('recurring')
    setPath([])
  }

  function showInvestments() {
    onChangeView('investments')
    setPath([])
  }

  function showGeneralLedger() {
    onChangeView('ledger')
    setPath([])
  }

  return <main ref={sectionRef} className={`energy-home theme-${theme}`}>
    <TreeHeader
      isExample={isExample}
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
      onSaveDrivePlan={onSaveDrivePlan}
      hasUnsavedChanges={hasUnsavedChanges}
      onDownloadBackup={onDownloadBackup}
      onEditJson={onEditJson}
      onRecoverDriveVersion={onRecoverDriveVersion}
      onToggleTheme={onToggleTheme}
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
    {view === 'loans' ? <LoansView loans={loans} focusedLoanId={focusedNodeId} onSaveLoan={onSaveLoan} onDeleteLoan={onDeleteLoan} /> : view === 'goals' ? <GoalsView goals={goals} focusedGoalId={focusedNodeId} onSaveGoal={onSaveGoal} /> : view === 'recurring' ? <RecurringPaymentsView plan={{ tree, incomeSources, buffer, monthlyHistory }} /> : view === 'investments' ? <InvestmentsView investments={investments} onSaveInvestment={onSaveInvestment} /> : view === 'ledger' ? <GeneralLedgerView ledgers={generalLedgers} onSaveLedger={onSaveGeneralLedger} onDeleteLedger={onDeleteGeneralLedger} onSaveExpense={onSaveLedgerExpense} onDeleteEntry={onDeleteLedgerEntry} /> : <><div ref={viewportRef} className={`energy-viewport${view === 'sinking' ? ' is-sinking' : ''}${canvasControls.locked ? ' is-pinned' : ''}${hasMeasuredViewport ? ' is-measured' : ''}${showMobileHomeOutlook ? ' has-mobile-home-outlook' : ''}`} tabIndex={0} role="region" aria-label="Interactive energy tree. Amounts are monthly targets.">
      {showMobileHomeOutlook && <MobileHomeOutlook profile={profile} driveUser={driveUser} income={income} buffer={buffer} planned={planned} />}
      {view === 'sinking' && <SinkingFundsSummary tree={sinkingTree} isExample={isExample} />}
      <div className="tree-zoom-layer" style={{ zoom: canvasControls.zoom }}>{visibleTree.length
        ? <TreeCanvas
            key={view}
            layout={layout}
            monthlyIncome={income}
            monthlyDeductions={planned}
            mobile={isMobileLayout}
            collapsedPaths={collapsedPaths}
            path={path}
            driveSaved={showDriveSaved}
            sinking={view === 'sinking'}
            incomeSources={view === 'sinking' ? [] : incomeSources}
            tree={visibleTree}
            onManageIncomeSource={onManageIncomeSource}
            onInspectIncome={onInspectIncome}
            onNavigate={navigate}
            onInspect={inspectNode}
            onInspectPlan={onInspectPlan}
          />
        : <EmptyTreeState sinking={view === 'sinking'} onReturnHome={returnToRoot} />}</div>
    </div>
    {!isMobileLayout && <CanvasControls {...canvasControls} sinking={view === 'sinking'} />}
    </>}
  </main>
}
