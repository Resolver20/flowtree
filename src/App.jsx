import { useEffect, useRef, useState } from 'react'
import { parseFlowImport, serializeFlowData } from './domain/flowDataTransfer'
import { findNode, organizeSubscriptions, pathToNode } from './domain/flowTree'
import { loanProjection } from './domain/loan'
import { canAutosaveDrive } from './domain/driveSyncState'
import EnergyExplorer from './features/flowtree/EnergyExplorer'
import PlanDialog from './features/flowtree/PlanDialog'
import { createBlankFlowData, useFlowData } from './hooks/useFlowData'
import { connectGoogleDrive, downloadFlowtreeBackup, findFlowtreeBackup, findOrCreateFolder, getDriveUser, revokeGoogleDriveAccess, uploadFlowtreeBackup } from './lib/googleDriveSync'

const DRIVE_FOLDER_NAME = 'FlowTree'
const DRIVE_FILE_NAME = 'flowtree-plan.json'
const DRIVE_SESSION_KEY = 'flowtree-drive-session-v1'
const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID

function readDriveSession() {
  try {
    const session = JSON.parse(window.sessionStorage.getItem(DRIVE_SESSION_KEY) || 'null')
    return session?.accessToken && session?.folderId && session?.fileId ? session : null
  } catch {
    return null
  }
}

function writeDriveSession(session) {
  window.sessionStorage.setItem(DRIVE_SESSION_KEY, JSON.stringify(session))
}

function clearDriveSession() {
  window.sessionStorage.removeItem(DRIVE_SESSION_KEY)
}

function App() {
  const { profile, incomeSources, generalLedgers, buffer, tree, setBuffer, changeProfile, changeIncomeSource, createIncomeSource, deleteIncomeSource, restoreIncomeSources, createGeneralLedger, updateGeneralLedger, deleteGeneralLedger, createLedgerEntry, deleteLedgerEntry, changeNode, changeNodes, createChild, deleteNode, restoreTree, replaceData } = useFlowData()
  const [dialog, setDialog] = useState(null)
  const [path, setPath] = useState([])
  const [notice, setNotice] = useState(null)
  const [drive, setDrive] = useState(() => {
    const session = readDriveSession()
    return session
      ? { status: 'restoring', user: null, error: '', ...session }
      : { status: googleClientId ? 'idle' : 'unavailable', user: null, error: '', accessToken: '', folderId: '', fileId: '' }
  })
  const replaceDataRef = useRef(replaceData)
  const hasAttemptedDriveRestore = useRef(false)
  const driveSaveQueueRef = useRef({ inFlight: false, pending: null })
  const driveConnectionRef = useRef('')
  const autosaveReady = canAutosaveDrive(drive)

  function notify(message) {
    setNotice({ message })
  }

  useEffect(() => { replaceDataRef.current = replaceData }, [replaceData])

  useEffect(() => {
    if (!notice) return undefined
    const timeout = window.setTimeout(() => setNotice(null), notice.tree || notice.undo ? 5000 : 3200)
    return () => window.clearTimeout(timeout)
  }, [notice])

  async function connectDrive({ prompt = 'select_account consent' } = {}) {
    if (!googleClientId) {
      setDrive(previous => ({ ...previous, status: 'unavailable', error: 'Google Drive sign-in has not been configured for this deployment.' }))
      return
    }
    setDrive(previous => ({ ...previous, status: 'connecting', error: '' }))
    try {
      const accessToken = await connectGoogleDrive({ clientId: googleClientId, prompt })
      const [user, folder] = await Promise.all([
        getDriveUser({ accessToken }),
        findOrCreateFolder({ accessToken, folderName: DRIVE_FOLDER_NAME }),
      ])
      const existingFile = await findFlowtreeBackup({ accessToken, folderId: folder.id, fileName: DRIVE_FILE_NAME })
      let file = existingFile
      if (existingFile) {
        const restoredPlan = parseFlowImport(await downloadFlowtreeBackup({ accessToken, fileId: existingFile.id }))
        replaceDataRef.current({ ...restoredPlan, tree: organizeSubscriptions(restoredPlan.tree) })
        setPath([])
        notify(`Your plan was restored from Google Drive for ${user.emailAddress || 'your Google account'}.`)
      } else {
        setDrive({ status: 'needs-plan-choice', setupRequired: true, user, error: '', accessToken, folderId: folder.id, fileId: '' })
        setDialog({ type: 'driveSync' })
        return
      }
      writeDriveSession({ accessToken, folderId: folder.id, fileId: file.id })
      setDrive({ status: 'connected', user, error: '', accessToken, folderId: folder.id, fileId: file.id })
    } catch (error) {
      setDrive(previous => ({ ...previous, status: 'error', error: error.message || 'Google Drive sign-in failed.' }))
    }
  }

  useEffect(() => {
    const session = readDriveSession()
    if (hasAttemptedDriveRestore.current || !session) return
    hasAttemptedDriveRestore.current = true
    async function restore() {
      try {
        const [user, restoredPlan] = await Promise.all([
          getDriveUser({ accessToken: session.accessToken }),
          downloadFlowtreeBackup({ accessToken: session.accessToken, fileId: session.fileId }),
        ])
        const plan = parseFlowImport(restoredPlan)
        replaceDataRef.current({ ...plan, tree: organizeSubscriptions(plan.tree) })
        setPath([])
        setDrive({ status: 'connected', user, error: '', ...session })
      } catch {
        clearDriveSession()
        setDrive({ status: 'error', user: null, error: 'Could not restore your Google Drive plan. Sign in again to retry; no data was uploaded.', accessToken: '', folderId: '', fileId: '' })
      }
    }
    restore()
  }, [])

  useEffect(() => {
    if (drive.accessToken && drive.folderId && drive.fileId) writeDriveSession({ accessToken: drive.accessToken, folderId: drive.folderId, fileId: drive.fileId })
  }, [drive.accessToken, drive.folderId, drive.fileId])

  useEffect(() => {
    driveConnectionRef.current = [drive.accessToken, drive.folderId, drive.fileId].join(':')
  }, [drive.accessToken, drive.folderId, drive.fileId])

  async function disconnectDrive() {
    driveSaveQueueRef.current.pending = null
    driveConnectionRef.current = ''
    await revokeGoogleDriveAccess(drive.accessToken)
    clearDriveSession()
    replaceData(createBlankFlowData())
    setPath([])
    setDrive({ status: googleClientId ? 'idle' : 'unavailable', user: null, error: '', accessToken: '', folderId: '', fileId: '' })
    notify('Signed out. This tab no longer holds your plan.')
  }

  async function completeDriveSetup({ useCurrentPlan }) {
    if (!drive.accessToken || !drive.folderId || drive.status !== 'needs-plan-choice') return
    const plan = useCurrentPlan
      ? { profile, incomeSources, generalLedgers, buffer: Number(buffer) || 0, tree }
      : createBlankFlowData()
    setDrive(previous => ({ ...previous, status: 'saving', error: '' }))
    try {
      const file = await uploadFlowtreeBackup({ accessToken: drive.accessToken, folderId: drive.folderId, fileName: DRIVE_FILE_NAME, contents: serializeFlowData(plan) })
      if (!useCurrentPlan) {
        replaceData(plan)
        setPath([])
      }
      writeDriveSession({ accessToken: drive.accessToken, folderId: drive.folderId, fileId: file.id })
      setDrive(previous => ({ ...previous, status: 'saved', setupRequired: false, error: '', fileId: file.id }))
      setDialog(null)
      notify(useCurrentPlan ? 'Your current plan was saved to Google Drive.' : 'A new private FlowTree plan was created in your Google Drive.')
    } catch (error) {
      setDrive(previous => ({ ...previous, status: 'needs-plan-choice', setupRequired: true, error: error.message || 'Could not create your Google Drive plan.' }))
    }
  }

  function cancelDriveSetup() {
    clearDriveSession()
    setDrive({ status: googleClientId ? 'idle' : 'unavailable', setupRequired: false, user: null, error: '', accessToken: '', folderId: '', fileId: '' })
    setDialog(null)
  }

  useEffect(() => {
    if (!autosaveReady) return undefined
    const connectionKey = [drive.accessToken, drive.folderId, drive.fileId].join(':')
    const snapshot = serializeFlowData({ profile, incomeSources, generalLedgers, buffer: Number(buffer) || 0, tree })
    // Every planner mutation changes one of these dependencies. Debouncing keeps
    // rapid form edits from producing a Drive upload for every keystroke.
    const saveNextSnapshot = async () => {
      const queue = driveSaveQueueRef.current
      if (queue.inFlight || !queue.pending) return
      const next = queue.pending
      queue.pending = null
      queue.inFlight = true
      setDrive(previous => ({ ...previous, status: 'saving', error: '' }))
      try {
        await uploadFlowtreeBackup({ ...next, fileName: DRIVE_FILE_NAME })
        // A newer edit waits in the queue. It must be uploaded before this UI
        // can report a saved state, preventing an old snapshot from winning.
        if (!queue.pending && driveConnectionRef.current === next.connectionKey) setDrive(previous => ({ ...previous, status: 'saved' }))
      } catch (error) {
        if (driveConnectionRef.current === next.connectionKey) setDrive(previous => ({ ...previous, status: 'error', error: error.message || 'Could not save your FlowTree plan to Google Drive.' }))
      } finally {
        queue.inFlight = false
        if (queue.pending) saveNextSnapshot()
      }
    }
    const timer = window.setTimeout(() => {
      driveSaveQueueRef.current.pending = { accessToken: drive.accessToken, folderId: drive.folderId, fileId: drive.fileId, contents: snapshot, connectionKey }
      saveNextSnapshot()
    }, 700)
    return () => window.clearTimeout(timer)
  }, [autosaveReady, drive.accessToken, drive.folderId, drive.fileId, profile, incomeSources, generalLedgers, buffer, tree])

  function deleteItem(id) {
    const node = findNode(tree, id)
    setNotice({ message: `${node.name} deleted.`, tree, path })
    deleteNode(id)
    if (path.includes(id)) setPath(path.slice(0, path.indexOf(id)))
    setDialog(null)
  }

  function saveNode({ nodeId, parentId, ...changes }) {
    if (nodeId) { changeNode(nodeId, changes); notify(`${changes.name} updated.`); return }
    const parent = parentId ? findNode(tree, parentId) : null
    const id = crypto.randomUUID()
    createChild(parentId ?? null, { id, ...changes, tone: parent?.tone || 'blue', note: '', children: [] })
    setPath([...pathToNode(tree, parentId), id])
    notify(`${changes.name} added.`)
  }

  function saveIncomeSource({ sourceId, ...changes }) {
    if (sourceId) { changeIncomeSource(sourceId, changes); notify(`${changes.name} updated.`) } else { createIncomeSource({ id: crypto.randomUUID(), ...changes }); notify(`${changes.name} added.`) }
  }

  function saveLoan({ id, name, loan }) {
    const { scheduledPayment } = loanProjection(loan)
    const destination = drive.accessToken && drive.folderId && drive.fileId
      ? 'Home updated. Saving to Google Drive…'
      : 'Home updated. Sign in to Google Drive to save this plan there.'
    if (id) {
      changeNode(id, { name, loan, amount: scheduledPayment, period: 'month' })
      notify(`${name} loan details updated. ${destination}`)
      return
    }
    const debt = findNode(tree, 'obligations')
    createChild('obligations', { id: crypto.randomUUID(), name, amount: scheduledPayment, savedAmount: 0, period: 'month', status: 'active', icon: 'account_balance', symbol: 'account_balance', tone: debt?.tone || 'coral', note: '', loan, children: [] })
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

  function saveInvestment({ id, name, type, amount, currentValue, status, symbol }) {
    // `amount` remains the monthly planning contribution. The recorded value
    // is deliberately metadata, so it cannot be mistaken for allocatable cash.
    const changes = { name, amount, savedAmount: 0, period: 'month', dueDate: '', startDate: '', status, icon: symbol, symbol, investment: { type, currentValue } }
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
    const previous = incomeSources
    deleteIncomeSource(sourceId)
    setDialog(null)
    setNotice({ message: `${source.name} deleted.`, undo: () => restoreIncomeSources(previous) })
  }

  function removeProfile() {
    changeProfile({ visible: false })
    setDialog(null)
    setNotice({ message: 'Profile marker removed.', undo: () => changeProfile({ visible: true }) })
  }

  function importJson(data) {
    const previous = { profile, incomeSources, generalLedgers, buffer: Number(buffer) || 0, tree }
    replaceData(data)
    setPath([])
    setDialog(null)
    setNotice({ message: 'JSON plan imported.', undo: () => replaceData(previous) })
  }

  function applyJson(data) {
    if (!data) {
      setDialog({ type: 'editJson' })
      return
    }
    const previous = { profile, incomeSources, generalLedgers, buffer: Number(buffer) || 0, tree }
    replaceData(data)
    setPath([])
    setDialog(null)
    setNotice({ message: 'Plan JSON updated.', undo: () => replaceData(previous) })
  }

  const monthlyIncome = incomeSources.reduce((sum, source) => sum + Math.max(0, Number(source.amount) || 0), 0)
  const driveUser = drive.user ? { emailAddress: drive.user.emailAddress, displayName: drive.user.displayName, photoLink: drive.user.photoLink } : null

  return <div className="app-shell energy-mode">
    <EnergyExplorer tree={tree} path={path} onPathChange={setPath} profile={profile} incomeSources={incomeSources} generalLedgers={generalLedgers} salary={monthlyIncome} buffer={Number(buffer) || 0} onManageIncomeSource={sourceId => setDialog({ type: 'manageIncomeSource', sourceId })} onConnectDrive={connectDrive} onEditJson={() => setDialog({ type: 'editJson' })} onManageNode={nodeId => setDialog({ type: 'manage', nodeId })} onSaveLoan={saveLoan} onSaveGoal={saveGoal} onSaveInvestment={saveInvestment} onSaveGeneralLedger={saveGeneralLedger} onDeleteGeneralLedger={deleteGeneralLedger} onSaveLedgerExpense={saveLedgerExpense} onDeleteLedgerEntry={deleteLedgerEntry} driveUser={driveUser} driveStatus={drive.status} driveError={drive.error} driveConfigured={Boolean(googleClientId)} />
    {notice && <div className="change-notice" role="status"><span>{notice.message}</span>{(notice.tree || notice.undo) && <button onClick={() => { if (notice.tree) { restoreTree(notice.tree); setPath(notice.path) } else { notice.undo() } notify('Deletion undone.') }}>Undo</button>}<button aria-label="Dismiss notification" onClick={() => setNotice(null)}>×</button></div>}
    <PlanDialog key={dialog ? `${dialog.type}-${dialog.nodeId || dialog.sourceId || dialog.parentId || 'root'}` : 'closed'} dialog={dialog} profile={profile} incomeSources={incomeSources} generalLedgers={generalLedgers} buffer={buffer} tree={tree} driveStatus={drive.status} driveUser={driveUser} driveError={drive.error} driveConfigured={Boolean(googleClientId)} driveSetupRequired={Boolean(drive.setupRequired)} onClose={() => dialog?.type === 'driveSync' && drive.setupRequired ? cancelDriveSetup() : setDialog(null)} onSaveProfile={name => { changeProfile({ name, visible: true }); notify('Profile updated.') }} onDeleteProfile={removeProfile} onSaveIncomeSource={saveIncomeSource} onDeleteIncomeSource={removeIncomeSource} onSaveAnnualTargets={updates => { changeNodes(updates); notify(`${updates.length} yearly ${updates.length === 1 ? 'target' : 'targets'} updated.`) }} onSaveBuffer={value => { setBuffer(value); notify('Safety buffer updated.') }} onSaveNode={saveNode} onDeleteNode={deleteItem} onImportData={importJson} onApplyJson={applyJson} onRequestEdit={nodeId => setDialog({ type: 'node', nodeId })} onRequestAdd={parentId => setDialog({ type: 'node', parentId })} onRequestEditIncomeSource={sourceId => setDialog({ type: 'incomeSource', sourceId })} onRequestEditProfile={() => setDialog({ type: 'profile' })} onRequestAddIncomeSource={() => setDialog({ type: 'incomeSource' })} onRequestSinkingFunds={() => setDialog({ type: 'sinkingFunds' })} onConnectDrive={connectDrive} onAddDriveAccount={connectDrive} onSwitchDriveAccount={connectDrive} onDisconnectDrive={disconnectDrive} onUseCurrentDrivePlan={() => completeDriveSetup({ useCurrentPlan: true })} onCreateBlankDrivePlan={() => completeDriveSetup({ useCurrentPlan: false })} />
  </div>
}

export default App
