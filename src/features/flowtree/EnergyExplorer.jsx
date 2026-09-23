import { useEffect, useMemo, useRef, useState } from 'react'
import { allocateEnergy, energyAtPath } from '../../domain/energyFlow'
import { findPath, sortTreeByMonthlyTotal, totalChildren } from '../../domain/flowTree'
import { formatMoney } from '../../lib/money'
import TreeCanvas from './TreeCanvas'
import TreeHeader from './TreeHeader'
import TreeStatus from './TreeStatus'
import { createTreeLayout } from './treeLayout'
import { useElementSize } from './useElementSize'
import './EnergyExplorer.css'

export default function EnergyExplorer({ tree, path, onPathChange: setPath, profile, incomeSources, salary, buffer, driveStatus, onAddChild, onAddIncomeSource, onManageAnnualTargets, onManageIncomeSource, onManageProfile, onManageNode, onEditBuffer, onExportJson, onImportJson, onManageDrive }) {
  const [demo, setDemo] = useState(false)
  const [expandAll, setExpandAll] = useState(false)
  const [planOpen, setPlanOpen] = useState(true)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const hasRenderedTree = useRef(false)
  const [viewportRef, viewport] = useElementSize()
  const orderedTree = useMemo(() => sortTreeByMonthlyTotal(tree), [tree])

  const income = demo ? Math.round(totalChildren(orderedTree) * .75 + buffer) : salary
  const flow = useMemo(() => allocateEnergy(orderedTree, Math.max(0, income - buffer)), [orderedTree, income, buffer])
  const currentNode = findPath(orderedTree, path)
  const currentFunding = energyAtPath(flow.allocations, path)
  const currentChildren = currentNode?.children || tree
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
    ...createTreeLayout({ tree: orderedTree, path, allocations: flow.allocations, expandAll, planOpen, viewport, incomeSourceCount: incomeSources.length, showPerson: profile.visible }),
    available: Math.max(0, income - buffer),
    income,
  }), [orderedTree, path, flow.allocations, expandAll, planOpen, viewport, income, buffer, incomeSources.length, profile.visible])
  const breadcrumbs = path.map((_, index) => ({ path: path.slice(0, index + 1), node: findPath(orderedTree, path.slice(0, index + 1)) }))

  useEffect(() => {
    if (!hasRenderedTree.current) {
      hasRenderedTree.current = true
      return undefined
    }
    setIsTransitioning(true)
    const timer = window.setTimeout(() => setIsTransitioning(false), 420)
    return () => window.clearTimeout(timer)
  }, [expandAll, path])

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
    setExpandAll(false)
    setPath([])
  }

  function toggleExpandAll() {
    setExpandAll(value => !value)
    setPlanOpen(true)
    setPath([])
  }

  return <main className="energy-home">
    <TreeHeader
      breadcrumbs={breadcrumbs}
      demo={demo}
      expandAll={expandAll}
      driveStatus={driveStatus}
      onReturnToRoot={returnToRoot}
      onNavigate={setPath}
      onAddIncomeSource={onAddIncomeSource}
      onManageAnnualTargets={onManageAnnualTargets}
      onEditBuffer={onEditBuffer}
      onAddChild={onAddChild}
      onExportJson={onExportJson}
      onImportJson={onImportJson}
      onToggleExpandAll={toggleExpandAll}
      onToggleDemo={() => setDemo(value => !value)}
      onManageDrive={onManageDrive}
    />
    <div ref={viewportRef} className="energy-viewport" tabIndex={0} role="region" aria-label="Interactive energy tree. Amounts are monthly targets.">
      <TreeCanvas
        layout={layout}
        isTransitioning={isTransitioning}
        planOpen={planOpen}
        onTogglePlan={togglePlan}
        path={path}
        profile={profile}
        incomeSources={incomeSources}
        tree={orderedTree}
        onManageIncomeSource={onManageIncomeSource}
        onManageProfile={onManageProfile}
        onNavigate={navigate}
        onInspect={onManageNode}
      />
    </div>
    <TreeStatus demo={demo} flow={flow} available={layout.available} status={status} />
  </main>
}
