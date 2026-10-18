import { useEffect, useMemo, useRef, useState } from 'react'
import { allocateEnergy, energyAtPath } from '../../domain/energyFlow'
import { findPath, sortTreeByMonthlyTotal, totalChildren } from '../../domain/flowTree'
import { formatMoney } from '../../lib/money'
import TreeCanvas from './TreeCanvas'
import TreeHeader from './TreeHeader'
import TreeStatus from './TreeStatus'
import LoansView from './LoansView'
import GoalsView from './GoalsView'
import { createTreeLayout } from './treeLayout'
import { useElementSize } from './useElementSize'
import './EnergyExplorer.css'

const THEME_SESSION_KEY = 'flowtree-theme'

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

export default function EnergyExplorer({ tree, path, onPathChange: setPath, profile, incomeSources, salary, buffer, driveUser, driveStatus, driveConfigured, onManageIncomeSource, onConnectDrive, onEditJson, onManageNode, onSaveLoan, onSaveGoal }) {
  const demo = false
  const [view, setView] = useState('home')
  const [expandAll, setExpandAll] = useState(false)
  const [planOpen, setPlanOpen] = useState(true)
  const [theme, setTheme] = useState(readTheme)
  const [showDriveSaved, setShowDriveSaved] = useState(false)
  const previousDriveStatus = useRef(driveStatus)
  const [viewportRef, viewport, hasMeasuredViewport] = useElementSize()
  const orderedTree = useMemo(() => sortTreeByMonthlyTotal(tree), [tree])
  const sinkingTree = useMemo(() => sortTreeByMonthlyTotal(annualTargetsOnly(tree)), [tree])
  const visibleTree = view === 'sinking' ? sinkingTree : orderedTree
  const loans = useMemo(() => {
    const debt = tree.find(node => node.id === 'obligations')
    return (debt?.children || []).filter(node => node.loan || /loan|emi|debt/i.test(node.name))
  }, [tree])
  const goals = useMemo(() => tree.find(node => node.id === 'goals')?.children || [], [tree])
  const visibleTreeExpanded = expandAll
  const showProfileMarker = profile.visible && view === 'home'

  const income = demo ? Math.round(totalChildren(visibleTree) * .75 + buffer) : salary
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
    ...createTreeLayout({ tree: visibleTree, path, allocations: flow.allocations, expandAll: visibleTreeExpanded, planOpen, viewport, incomeSourceCount: incomeSources.length, showPerson: showProfileMarker }),
    available: Math.max(0, income - buffer),
    income,
  }), [visibleTree, path, flow.allocations, visibleTreeExpanded, planOpen, viewport, income, buffer, incomeSources.length, showProfileMarker])
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
    const leftDelta = targetBox.left + targetBox.width / 2 - (canvasBox.left + canvasBox.width / 2)
    const topDelta = targetBox.top + targetBox.height / 2 - (canvasBox.top + canvasBox.height / 2)
    const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
    canvas.scrollBy({ left: leftDelta, top: topDelta, behavior })
  }, [path, viewport.width, viewportRef])

  useEffect(() => {
    if (!viewportRef.current) return
    viewportRef.current.scrollTo({ left: 0, top: 0, behavior: 'auto' })
  }, [planOpen, viewport.width, viewportRef])

  function navigate(nextPath) {
    setPlanOpen(true)
    setPath(current => nextPath.join('/') === current.join('/') ? current.slice(0, -1) : nextPath)
  }

  function togglePlan() {
    setPlanOpen(value => !value)
    setExpandAll(false)
    setPath([])
  }

  function returnToRoot() {
    setView('home')
    setExpandAll(false)
    setPath([])
  }

  function toggleExpandAll() {
    if (view === 'sinking') {
      setView('home')
      setExpandAll(true)
      setPlanOpen(true)
      setPath([])
      return
    }
    setExpandAll(value => !value)
    setPlanOpen(true)
    setPath([])
  }

  function showSinkingFunds() {
    setView('sinking')
    setExpandAll(false)
    setPlanOpen(true)
    setPath([])
  }

  function showLoans() {
    setView('loans')
    setExpandAll(false)
    setPath([])
  }

  function showGoals() {
    setView('goals')
    setExpandAll(false)
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
      driveConfigured={driveConfigured}
      theme={theme}
      onConnectDrive={onConnectDrive}
      onEditJson={onEditJson}
      onToggleTheme={() => setTheme(current => current === 'light' ? 'dark' : 'light')}
      onShowSinkingFunds={showSinkingFunds}
      onShowLoans={showLoans}
      onShowGoals={showGoals}
      onToggleExpandAll={toggleExpandAll}
    />
    {view === 'loans' ? <LoansView loans={loans} onSaveLoan={onSaveLoan} /> : view === 'goals' ? <GoalsView goals={goals} onSaveGoal={onSaveGoal} /> : <><div ref={viewportRef} className={`energy-viewport${hasMeasuredViewport ? ' is-measured' : ''}`} tabIndex={0} role="region" aria-label="Interactive energy tree. Amounts are monthly targets.">
      <TreeCanvas
        layout={layout}
        planOpen={planOpen}
        onTogglePlan={togglePlan}
        path={path}
        profile={showProfileMarker ? profile : { ...profile, visible: false }}
        driveSaved={showDriveSaved}
        incomeSources={incomeSources}
        tree={visibleTree}
        onManageIncomeSource={onManageIncomeSource}
        onNavigate={navigate}
        onInspect={onManageNode}
      />
    </div>
    <TreeStatus demo={demo} sinking={view === 'sinking'} flow={flow} available={layout.available} status={status} /></>}
  </main>
}
