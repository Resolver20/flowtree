import { useEffect, useState } from 'react'
import { findNode, isBuiltInFlowGroup, pathToNode } from './domain/flowTree'
import { loanProjection } from './domain/loan'
import EnergyExplorer from './features/flowtree/EnergyExplorer'
import { useGoogleDrivePlan } from './hooks/useGoogleDrivePlan'
import PlanDialog from './features/flowtree/PlanDialog'
import PlanRestoreScreen from './features/flowtree/PlanRestoreScreen'
import { useTheme } from './hooks/useTheme'
import { useSessionState } from './hooks/useSessionState'
import { useFlowData } from './hooks/useFlowData'

function App({ offlinePlan, onSaveOfflinePlan } = {}) {
  const [theme, toggleTheme] = useTheme()
  const offline = import.meta.env.DEV && Boolean(offlinePlan)
  const { profile, incomeSources, generalLedgers, monthlyHistory, captureCurrentMonth, markPaymentPaid, buffer, tree, setBuffer, changeProfile, changeIncomeSource, createIncomeSource, deleteIncomeSource, createGeneralLedger, updateGeneralLedger, deleteGeneralLedger, createLedgerEntry, deleteLedgerEntry, changeNode, changeNodes, createChild, deleteNode, replaceData, undo, redo, canUndo, canRedo } = useFlowData(offline ? offlinePlan : undefined)
  const [dialog, setDialog] = useState(null)
  const [path, setPath] = useState([])
  const [notice, setNotice] = useState(null)
  const [navigation, setNavigation] = useSessionState('flowtree-navigation', { view: 'home', nodeId: null },
    value => ['home', 'sinking', 'loans', 'goals', 'recurring', 'investments', 'ledger'].includes(value?.view) && (value.nodeId === null || typeof value.nodeId === 'string'))
  function notify(message) {
    setNotice({ message })
  }

  const { drive, startupState, connectDrive, disconnectDrive, saveDrivePlan, completeDriveSetup, cancelDriveSetup, chooseDriveRestoreCandidate, openDriveRevisionRecovery, restoreDriveRevision, driveConfigured, hasUnsavedChanges, downloadBackup } = useGoogleDrivePlan({
    offline, onSaveOfflinePlan,
    plan: { profile, incomeSources, generalLedgers, monthlyHistory, buffer, tree },
    replaceData, captureCurrentMonth, dialog, setDialog, setPath, notify,
  })

  useEffect(() => {
    if (!notice) return undefined
    const timeout = window.setTimeout(() => setNotice(null), notice.tree || notice.undo ? 5000 : 3200)
    return () => window.clearTimeout(timeout)
  }, [notice])

  function deleteItem(id) {
    const node = findNode(tree, id)
    if (!node) return
    if (isBuiltInFlowGroup(id) && pathToNode(tree, id).length === 1) {
      notify(`${node.name} stays in your plan so deleting an item cannot remove its category or other data.`)
      setDialog(null)
      return
    }
    notify(`${node.name} deleted.`)
    deleteNode(id)
    if (path.includes(id)) setPath(path.slice(0, path.indexOf(id)))
    setDialog(null)
  }

  function saveNode({ nodeId, parentId, ...changes }) {
    if (nodeId) {
      const projection = changes.loan ? loanProjection(changes.loan) : null
      const nextChanges = projection
        ? { ...changes, loan: { ...changes.loan, userMonthlyContribution: projection.userMonthlyContribution }, amount: projection.userMonthlyContribution, period: 'month' }
        : changes
      changeNode(nodeId, nextChanges)
      notify(`${changes.name} updated.`)
      return
    }
    const parent = parentId ? findNode(tree, parentId) : null
    const id = crypto.randomUUID()
    createChild(parentId ?? null, { id, ...changes, tone: parent?.tone || 'blue', note: '', children: [] })
    setPath([...pathToNode(tree, parentId), id])
    notify(`${changes.name} added.`)
  }

  function saveIncomeSource({ sourceId, ...changes }) {
    if (sourceId) { changeIncomeSource(sourceId, changes); notify(`${changes.name} updated.`) } else { createIncomeSource({ id: crypto.randomUUID(), ...changes }); notify(`${changes.name} added.`) }
  }

  function saveLoan({ id, name, loan, status, startDate }) {
    const projection = loanProjection(loan)
    const savedLoan = { ...loan, userMonthlyContribution: projection.userMonthlyContribution }
    const destination = drive.accessToken && drive.folderId && drive.fileId
      ? 'Home updated. Use Save to Google Drive to save these changes.'
      : 'Home updated. Sign in to Google Drive to save this plan there.'
    if (id) {
      changeNode(id, { name, status, startDate, loan: savedLoan, amount: projection.userMonthlyContribution, period: 'month' })
      notify(`${name} loan details updated. ${destination}`)
      return
    }
    const debt = findNode(tree, 'obligations')
    createChild('obligations', { id: crypto.randomUUID(), name, amount: projection.userMonthlyContribution, savedAmount: 0, period: 'month', status, startDate, icon: 'account_balance', symbol: 'account_balance', tone: debt?.tone || 'coral', note: '', loan: savedLoan, children: [] })
    notify(`${name} added to Debt Commitments. ${destination}`)
  }

  function saveGoal({ id, name, amount, savedAmount, startDate, period, dueDate, status, symbol }) {
    const changes = { name, amount, period, dueDate, startDate, status, savedAmount, icon: symbol, symbol }
    if (id) {
      changeNode(id, changes)
      notify(`${name} life goal updated.`)
      return
    }
    const goalGroup = findNode(tree, 'goals')
    createChild('goals', { id: crypto.randomUUID(), ...changes, tone: goalGroup?.tone || 'pink', note: '', children: [] })
    notify(`${name} added to Life goals.`)
  }

  function saveRecurringPaymentDay(id, dayOfMonth) {
    const node = findNode(tree, id)
    if (!node) return
    changeNode(id, { dayOfMonth })
    notify(`${node.name} payment day updated.`)
  }

  function saveInvestment({ id, name, type, amount, currentValue, status, startDate, symbol }) {
    // `amount` remains the monthly planning contribution. The recorded value
    // is deliberately metadata, so it cannot be mistaken for allocatable cash.
    const changes = { name, amount, savedAmount: 0, period: 'month', dueDate: '', startDate, status, icon: symbol, symbol, investment: { type, currentValue } }
    if (id) {
      changeNode(id, changes)
      notify(`${name} investment updated.`)
      return
    }
    const growth = findNode(tree, 'growth')
    createChild('growth', { id: crypto.randomUUID(), ...changes, tone: growth?.tone || 'green', note: '', children: [] })
    notify(`${name} added to Long-Term Growth.`)
  }

  function saveGeneralLedger({ id, name, note, symbol, budget }) {
    if (id) {
      updateGeneralLedger(id, { name, note, symbol, budget })
      notify(`${name} general ledger updated.`)
      return id
    }
    const ledgerId = crypto.randomUUID()
    createGeneralLedger({ id: ledgerId, name, note, symbol, budget, entries: [] })
    notify(`${name} general ledger created.`)
    return ledgerId
  }

  function saveLedgerExpense({ ledgerId, date, description, amount }) {
    createLedgerEntry(ledgerId, { id: crypto.randomUUID(), date, description, amount })
    notify(`${description} added to the general ledger.`)
  }

  function removeIncomeSource(sourceId) {
    const source = incomeSources.find(item => item.id === sourceId)
    if (!source) return
    deleteIncomeSource(sourceId)
    setDialog(null)
    notify(`${source.name} deleted.`)
  }

  function removeProfile() {
    changeProfile({ visible: false })
    setDialog(null)
    notify('Profile marker removed.')
  }

  function importJson(data) {
    replaceData(data)
    setPath([])
    setDialog(null)
    notify('JSON plan imported.')
  }

  function applyJson(data) {
    if (!data) {
      setDialog({ type: 'editJson' })
      return
    }
    replaceData(data)
    setPath([])
    setDialog(null)
    notify('Plan JSON updated.')
  }

  function undoPlan() {
    if (!canUndo) return
    undo()
    setPath([])
    setDialog(null)
    notify('Last plan change undone. Google Drive was not changed.')
  }

  function redoPlan() {
    redo()
    setPath([])
    setDialog(null)
    notify('Plan change restored.')
  }

  const monthlyIncome = incomeSources.reduce((sum, source) => sum + Math.max(0, Number(source.amount) || 0), 0)
  const driveUser = drive.user ? { emailAddress: drive.user.emailAddress, displayName: drive.user.displayName, photoLink: drive.user.photoLink } : null

  if (startupState !== 'ready') return <PlanRestoreScreen theme={theme} state={startupState} error={drive.error} onRetry={connectDrive} configured={driveConfigured} />

  return <div className={`app-shell energy-mode theme-${theme}`}>
    <EnergyExplorer
      theme={theme}
      onToggleTheme={toggleTheme}
      tree={tree}
      view={navigation.view}
      focusedNodeId={navigation.nodeId}
      onChangeView={view => setNavigation({ view, nodeId: null })}
      monthlyHistory={monthlyHistory}
      onMarkPaymentPaid={markPaymentPaid}
      hasUnsavedChanges={hasUnsavedChanges}
      onDownloadBackup={downloadBackup}
      path={path}
      onPathChange={setPath}
      profile={profile}
      incomeSources={incomeSources}
      generalLedgers={generalLedgers}
      salary={monthlyIncome}
      buffer={Number(buffer) || 0}
      canUndo={canUndo}
      canRedo={canRedo}
      onUndo={undoPlan}
      onRedo={redoPlan}
      onManageIncomeSource={sourceId => setDialog({ type: 'manageIncomeSource', sourceId })}
      onConnectDrive={connectDrive}
      onDisconnectDrive={disconnectDrive}
      onSaveDrivePlan={saveDrivePlan}
      onEditJson={() => setDialog({ type: 'editJson' })}
      onRecoverDriveVersion={openDriveRevisionRecovery}
      onManageNode={nodeId => setDialog({ type: 'manage', nodeId })}
      onSaveLoan={saveLoan}
      onDeleteLoan={deleteItem}
      onSaveGoal={saveGoal}
      onSaveRecurringPaymentDay={saveRecurringPaymentDay}
      onSaveInvestment={saveInvestment}
      onSaveGeneralLedger={saveGeneralLedger}
      onDeleteGeneralLedger={deleteGeneralLedger}
      onSaveLedgerExpense={saveLedgerExpense}
      onDeleteLedgerEntry={deleteLedgerEntry}
      driveUser={driveUser}
      driveStatus={drive.status}
      driveError={drive.error}
      driveConfigured={driveConfigured}
    />
    {notice && <div className="change-notice" role="status"><span>{notice.message}</span><button aria-label="Dismiss notification" onClick={() => setNotice(null)}>×</button></div>}
    <PlanDialog
      monthlyHistory={monthlyHistory}
      onViewOverview={nodeId => {
        const category = pathToNode(tree, nodeId)[0]
        setNavigation({ nodeId, view: category === 'obligations' ? 'loans' : 'goals' })
        setDialog(null)
      }}
      key={dialog ? `${dialog.type}-${dialog.nodeId || dialog.sourceId || dialog.parentId || 'root'}` : 'closed'}
      dialog={dialog}
      profile={profile}
      incomeSources={incomeSources}
      generalLedgers={generalLedgers}
      buffer={buffer}
      tree={tree}
      driveStatus={drive.status}
      driveUser={driveUser}
      driveError={drive.error}
      driveConfigured={driveConfigured}
      driveSetupRequired={Boolean(drive.setupRequired)}
      driveRestoreCandidates={drive.restoreCandidates || []}
      onClose={() => dialog?.type === 'driveSync' && (drive.setupRequired || drive.restoreCandidates?.length) ? cancelDriveSetup() : setDialog(null)}
      onSaveProfile={name => { changeProfile({ name, visible: true }); notify('Profile updated.') }}
      onDeleteProfile={removeProfile}
      onSaveIncomeSource={saveIncomeSource}
      onDeleteIncomeSource={removeIncomeSource}
      onSaveAnnualTargets={updates => { changeNodes(updates); notify(`${updates.length} yearly ${updates.length === 1 ? 'target' : 'targets'} updated.`) }}
      onSaveBuffer={value => { setBuffer(value); notify('Safety buffer updated.') }}
      onSaveNode={saveNode}
      onDeleteNode={deleteItem}
      onImportData={importJson}
      onApplyJson={applyJson}
      onRequestEdit={nodeId => setDialog({ type: 'node', nodeId })}
      onRequestAdd={parentId => setDialog({ type: 'node', parentId })}
      onRequestEditIncomeSource={sourceId => setDialog({ type: 'incomeSource', sourceId })}
      onRequestEditProfile={() => setDialog({ type: 'profile' })}
      onRequestAddIncomeSource={() => setDialog({ type: 'incomeSource' })}
      onRequestSinkingFunds={() => setDialog({ type: 'sinkingFunds' })}
      onConnectDrive={connectDrive}
      onAddDriveAccount={connectDrive}
      onSwitchDriveAccount={connectDrive}
      onDisconnectDrive={disconnectDrive}
      onUseCurrentDrivePlan={() => completeDriveSetup({ useCurrentPlan: true })}
      onCreateBlankDrivePlan={() => completeDriveSetup({ useCurrentPlan: false })}
      onChooseDriveRestoreCandidate={chooseDriveRestoreCandidate}
      onRecoverDriveVersion={openDriveRevisionRecovery}
      onRestoreDriveRevision={restoreDriveRevision}
    />
  </div>
}

export default App
