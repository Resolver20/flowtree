import { useEffect, useRef, useState } from 'react'
import { MAX_IMPORT_BYTES, parseFlowImport, serializeFlowData, summarizeFlowData } from './domain/flowDataTransfer'
import { findNode, pathToNode } from './domain/flowTree'
import EnergyExplorer from './features/flowtree/EnergyExplorer'
import GoogleDriveLogin from './features/flowtree/GoogleDriveLogin'
import PlanDialog from './features/flowtree/PlanDialog'
import { useFlowData } from './hooks/useFlowData'
import { connectGoogleDrive, downloadFlowtreeBackup, findFlowtreeBackup, findOrCreateFolder, getDriveUser, revokeGoogleDriveAccess, uploadFlowtreeBackup } from './lib/googleDriveSync'

const DRIVE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID
const DRIVE_FILE_NAME = 'flowtree-plan.json'

function App() {
  const { profile, incomeSources, buffer, tree, storageError, setBuffer, changeProfile, changeIncomeSource, createIncomeSource, deleteIncomeSource, restoreIncomeSources, changeNode, changeNodes, createChild, deleteNode, restoreTree, replaceData } = useFlowData()
  const [dialog, setDialog] = useState(null)
  const [path, setPath] = useState([])
  const [notice, setNotice] = useState(null)
  const [drive, setDrive] = useState({ status: 'idle', token: '', folderId: '', user: null, error: '' })
  const driveReady = drive.status === 'connected' || drive.status === 'saving' || drive.status === 'saved'
  const driveFileId = useRef('')

  function notify(message) { setNotice({ message }) }

  async function connectDrive() {
    setDrive(previous => ({ ...previous, status: 'connecting', error: '' }))
    try {
      const token = await connectGoogleDrive({ clientId: DRIVE_CLIENT_ID })
      const [user, folder] = await Promise.all([getDriveUser({ accessToken: token }), findOrCreateFolder({ accessToken: token })])
      const existing = await findFlowtreeBackup({ accessToken: token, folderId: folder.id, fileName: DRIVE_FILE_NAME })
      if (existing) {
        const imported = parseFlowImport(await downloadFlowtreeBackup({ accessToken: token, fileId: existing.id }))
        replaceData(imported)
        driveFileId.current = existing.id
        notify('Your plan was restored from Google Drive.')
      } else {
        driveFileId.current = ''
      }
      setDrive({ status: 'connected', token, folderId: folder.id, user, error: '' })
    } catch (error) {
      setDrive(previous => ({ ...previous, status: 'error', error: error.message || 'Google Drive connection failed.' }))
    }
  }

  async function disconnectDrive() {
    await revokeGoogleDriveAccess(drive.token)
    driveFileId.current = ''
    setDrive({ status: 'idle', token: '', folderId: '', user: null, error: '' })
    notify('Google Drive sync disconnected.')
  }

  useEffect(() => {
    if (!driveReady) return undefined
    const timer = window.setTimeout(async () => {
      setDrive(previous => ({ ...previous, status: 'saving', error: '' }))
      try {
        const text = serializeFlowData({ profile, incomeSources, buffer: Number(buffer) || 0, tree })
        const saved = await uploadFlowtreeBackup({ accessToken: drive.token, folderId: drive.folderId, fileId: driveFileId.current || undefined, contents: text, fileName: DRIVE_FILE_NAME })
        driveFileId.current = saved.id
        setDrive(previous => ({ ...previous, status: 'saved' }))
      } catch (error) {
        setDrive(previous => ({ ...previous, status: 'error', error: error.message || 'Google Drive save failed.' }))
      }
    }, 700)
    return () => window.clearTimeout(timer)
  }, [driveReady, drive.token, drive.folderId, profile, incomeSources, buffer, tree])

  function deleteItem(id) {
    const node = findNode(tree, id)
    setNotice({ message: `${node.name} deleted.`, tree, path })
    deleteNode(id)
    if (path.includes(id)) setPath(path.slice(0, path.indexOf(id)))
    setDialog(null)
  }

  function saveNode({ nodeId, parentId, ...changes }) {
    if (nodeId) {
      changeNode(nodeId, changes)
      notify(`${changes.name} updated.`)
      return
    }
    const parent = parentId ? findNode(tree, parentId) : null
    const id = crypto.randomUUID()
    createChild(parentId ?? null, {
      id,
      ...changes,
      tone: parent?.tone || 'blue',
      note: '',
      children: [],
    })
    setPath([...pathToNode(tree, parentId), id])
    notify(`${changes.name} added.`)
  }

  function saveIncomeSource({ sourceId, ...changes }) {
    if (sourceId) {
      changeIncomeSource(sourceId, changes)
      notify(`${changes.name} updated.`)
    } else {
      createIncomeSource({ id: crypto.randomUUID(), ...changes })
      notify(`${changes.name} added.`)
    }
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

  function exportJson() {
    const text = serializeFlowData({ profile, incomeSources, buffer: Number(buffer) || 0, tree })
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `flowtree-plan-${new Date().toISOString().slice(0, 10)}.json`
    document.body.append(link)
    link.click()
    link.remove()
    setTimeout(() => URL.revokeObjectURL(url), 0)
    notify('Plan exported as JSON.')
  }

  async function prepareJsonImport(file) {
    if (file.size > MAX_IMPORT_BYTES) { notify('Import failed: the JSON file is larger than 2 MB.'); return }
    try {
      const data = parseFlowImport(await file.text())
      setDialog({ type: 'importJson', data, summary: summarizeFlowData(data), fileName: file.name })
    } catch (error) {
      notify(`Import failed: ${error.message}`)
    }
  }

  function importJson(data) {
    const previous = { profile, incomeSources, buffer: Number(buffer) || 0, tree }
    replaceData(data)
    setPath([])
    setDialog(null)
    setNotice({ message: 'JSON plan imported.', undo: () => replaceData(previous) })
  }

  const monthlyIncome = incomeSources.reduce((sum, source) => sum + Math.max(0, Number(source.amount) || 0), 0)

  if (!driveReady) return <GoogleDriveLogin status={drive.status} error={drive.error} configured={Boolean(DRIVE_CLIENT_ID)} onConnect={connectDrive} />

  return <div className="app-shell energy-mode">
    <EnergyExplorer
      tree={tree}
      path={path}
      onPathChange={setPath}
      profile={profile}
      incomeSources={incomeSources}
      salary={monthlyIncome}
      buffer={Number(buffer) || 0}
      onAddChild={parentId => setDialog({ type: 'node', parentId })}
      onAddIncomeSource={() => setDialog({ type: 'incomeSource' })}
      onManageIncomeSource={sourceId => setDialog({ type: 'manageIncomeSource', sourceId })}
      onManageProfile={() => setDialog({ type: 'manageProfile' })}
      onManageAnnualTargets={() => setDialog({ type: 'annualTargets' })}
      onEditNode={nodeId => setDialog({ type: 'node', nodeId })}
      onManageNode={nodeId => setDialog({ type: 'manage', nodeId })}
      onEditBuffer={() => setDialog({ type: 'buffer' })}
      onExportJson={exportJson}
      onImportJson={prepareJsonImport}
      driveStatus={drive.status}
      onManageDrive={() => setDialog({ type: 'driveSync' })}
    />
    {storageError && <div className="storage-warning" role="alert">{storageError}</div>}
    {notice && <div className="change-notice" role="status">
      <span>{notice.message}</span>
      {(notice.tree || notice.undo) && <button onClick={() => { if (notice.tree) { restoreTree(notice.tree); setPath(notice.path) } else { notice.undo() } notify('Deletion undone.') }}>Undo</button>}
      <button aria-label="Dismiss notification" onClick={() => setNotice(null)}>×</button>
    </div>}
    <PlanDialog
      key={dialog ? `${dialog.type}-${dialog.nodeId || dialog.sourceId || dialog.parentId || 'root'}` : 'closed'}
      dialog={dialog}
      profile={profile}
      incomeSources={incomeSources}
      buffer={buffer}
      tree={tree}
      driveStatus={drive.status}
      driveUser={drive.user}
      driveError={drive.error}
      onClose={() => setDialog(null)}
      onSaveProfile={name => { changeProfile({ name, visible: true }); notify('Profile updated.') }}
      onDeleteProfile={removeProfile}
      onSaveIncomeSource={saveIncomeSource}
      onDeleteIncomeSource={removeIncomeSource}
      onSaveAnnualTargets={updates => { changeNodes(updates); notify(`${updates.length} yearly ${updates.length === 1 ? 'target' : 'targets'} updated.`) }}
      onSaveBuffer={value => { setBuffer(value); notify('Safety buffer updated.') }}
      onSaveNode={saveNode}
      onDeleteNode={deleteItem}
      onImportData={importJson}
      onRequestEdit={nodeId => setDialog({ type: 'node', nodeId })}
      onRequestAdd={parentId => setDialog({ type: 'node', parentId })}
      onRequestEditIncomeSource={sourceId => setDialog({ type: 'incomeSource', sourceId })}
      onRequestEditProfile={() => setDialog({ type: 'profile' })}
      onRequestAddIncomeSource={() => setDialog({ type: 'incomeSource' })}
      onConnectDrive={connectDrive}
      onDisconnectDrive={disconnectDrive}
    />
  </div>
}

export default App
