import { useEffect, useMemo, useRef, useState } from 'react'
import { parseFlowImport, serializeFlowData } from '../domain/flowDataTransfer'
import { organizeSubscriptions } from '../domain/flowTree'
import { restoreDriveSession } from '../domain/restoreDriveSession'
import { preserveCurrentMonth } from '../domain/monthlyHistory'
import { loadCachedRevision, loadRecoveryVersions } from '../domain/versionRecovery'
import { driveRestoreMode, orderValidDriveRestoreCandidates } from '../domain/driveRestoreCandidates'
import { createBlankFlowData, normalizeFlowData } from './useFlowData'
import { connectGoogleDrive, downloadFlowtreeBackup, downloadFlowtreeRevision, findOrCreateFolder, getDriveUser, listFlowtreeRestoreCandidates, listFlowtreeRevisions, revokeGoogleDriveAccess, uploadFlowtreeBackup } from '../lib/googleDriveSync'

const DRIVE_FOLDER_NAME = 'gpt'
const DRIVE_FILE_NAME = 'flowtree-plan.json'
const DRIVE_SESSION_KEY = 'flowtree-drive-session-v1'
const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID

function readDriveSession() {
  try {
    const session = JSON.parse(window.sessionStorage.getItem(DRIVE_SESSION_KEY) || 'null')
    return session?.accessToken && session?.folderId && session?.fileId && session.folderName === DRIVE_FOLDER_NAME ? session : null
  } catch {
    return null
  }
}

function writeDriveSession(session) {
  window.sessionStorage.setItem(DRIVE_SESSION_KEY, JSON.stringify({ ...session, folderName: DRIVE_FOLDER_NAME }))
}

function clearDriveSession() {
  window.sessionStorage.removeItem(DRIVE_SESSION_KEY)
}

// Owns the Drive connection and explicit save/recovery actions. Plan edits never upload.
export function useGoogleDrivePlan({ offline = false, onSaveOfflinePlan, plan, replaceData, captureCurrentMonth, dialog, setDialog, setPath, notify }) {
  const { profile, incomeSources, generalLedgers, monthlyHistory, buffer, tree } = plan
  const serializedPlan = useMemo(() => serializeFlowData({ profile, incomeSources, generalLedgers, monthlyHistory, buffer, tree }), [profile, incomeSources, generalLedgers, monthlyHistory, buffer, tree])
  const [savedContents, setSavedContents] = useState(() => serializedPlan)
  const hasUnsavedChanges = serializedPlan !== savedContents
  const savingRef = useRef(false)
  const recoveryCache = useRef(new Map())
  const recoveryRequest = useRef(0)

  useEffect(() => {
    if (!hasUnsavedChanges) return undefined
    const warnBeforeLeaving = event => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', warnBeforeLeaving)
    return () => window.removeEventListener('beforeunload', warnBeforeLeaving)
  }, [hasUnsavedChanges])

  function downloadBackup() {
    const url = URL.createObjectURL(new Blob([serializedPlan], { type: 'application/json' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `flowtree-backup-${new Date().toISOString().replaceAll(/[:.]/g, '-')}.json`
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  function allowDiscard() {
    return !hasUnsavedChanges || window.confirm('You have unsaved changes. Download a JSON backup or save to Google Drive first. Continue without saving?')
  }
  const [drive, setDrive] = useState(() => {
    if (offline) return { status: 'offline', user: null, error: '', accessToken: '', folderId: '', fileId: '' }
    const session = readDriveSession()
    return session
      ? { ...session, status: 'restoring', user: session.user || null, error: '' }
      : { status: googleClientId ? 'idle' : 'unavailable', user: null, error: '', accessToken: '', folderId: '', fileId: '' }
  })
  const [startupState, setStartupState] = useState(() => drive.status === 'restoring' ? 'loading' : 'ready')
  const replaceDataRef = useRef(replaceData)
  const hasAttemptedDriveRestore = useRef(false)

  useEffect(() => { replaceDataRef.current = replaceData }, [replaceData])

  async function restoreDriveCandidate({ accessToken, user, candidate, candidates = [] }) {
    try {
      const restoredPlan = normalizeFlowData(candidate.restoredPlan || parseFlowImport(await downloadFlowtreeBackup({ accessToken, fileId: candidate.id })))
      replaceDataRef.current({ ...restoredPlan, tree: organizeSubscriptions(restoredPlan.tree) }, { resetHistory: true })
      setSavedContents(serializeFlowData(restoredPlan))
      setPath([])
      writeDriveSession({ accessToken, folderId: candidate.folderId, fileId: candidate.id })
      setDrive({ status: 'connected', user, error: '', accessToken, folderId: candidate.folderId, fileId: candidate.id })
      setStartupState('ready')
      notify(`Your plan was restored from Google Drive for ${user.emailAddress || 'your Google account'}.`)
    } catch (error) {
      if (candidates.length > 1) {
        setDrive({ status: 'needs-restore-choice', user, error: error.message || 'Could not restore that Google Drive plan.', accessToken, folderId: '', fileId: '', restoreCandidates: candidates })
        setDialog({ type: 'driveSync' })
        return
      }
      if (startupState !== 'ready') setStartupState('error')
      setDrive({ status: 'error', user: null, error: error.message || 'Could not restore your Google Drive plan. No data was uploaded.', accessToken: '', folderId: '', fileId: '' })
    }
  }

  async function findValidDriveRestoreCandidates(accessToken, candidates) {
    const checkedCandidates = await Promise.all(candidates.map(async candidate => {
      try {
        const restoredPlan = parseFlowImport(await downloadFlowtreeBackup({ accessToken, fileId: candidate.id }))
        return { ...candidate, valid: true, restoredPlan }
      } catch {
        return { ...candidate, valid: false }
      }
    }))
    return orderValidDriveRestoreCandidates(checkedCandidates, DRIVE_FOLDER_NAME)
  }

  async function connectDrive({ prompt = 'select_account consent' } = {}) {
    if (offline) return
    if (!allowDiscard()) return
    if (!googleClientId) {
      setDrive(previous => ({ ...previous, status: 'unavailable', error: 'Google Drive sign-in has not been configured for this deployment.' }))
      return
    }
    if (startupState !== 'ready') setStartupState('loading')
    setDrive(previous => ({ ...previous, status: 'connecting', error: '' }))
    try {
      const accessToken = await connectGoogleDrive({ clientId: googleClientId, prompt })
      const [user, discovery] = await Promise.all([
        getDriveUser({ accessToken }),
        listFlowtreeRestoreCandidates({ accessToken, folderName: DRIVE_FOLDER_NAME }),
      ])
      const candidates = await findValidDriveRestoreCandidates(accessToken, discovery.candidates)
      const mode = driveRestoreMode(candidates)
      if (mode !== 'restore') setStartupState('ready')
      if (mode === 'restore') {
        await restoreDriveCandidate({ accessToken, user, candidate: candidates[0] })
        return
      }
      if (mode === 'choose') {
        setDrive({ status: 'needs-restore-choice', user, error: '', accessToken, folderId: '', fileId: '', restoreCandidates: candidates })
        setDialog({ type: 'driveSync' })
        return
      }
      const error = discovery.candidates.length ? 'No valid FlowTree plan was found in your gpt folder. No data was uploaded.' : ''
      setDrive({ status: 'needs-plan-choice', setupRequired: true, user, error, accessToken, folderId: discovery.folders[0]?.id || '', fileId: '' })
      setDialog({ type: 'driveSync' })
    } catch (error) {
      setDrive(previous => ({ ...previous, status: 'error', error: error.message || 'Google Drive sign-in failed.' }))
      if (startupState !== 'ready') setStartupState('error')
    }
  }

  useEffect(() => {
    if (offline) return
    const session = readDriveSession()
    if (hasAttemptedDriveRestore.current || !session) return
    hasAttemptedDriveRestore.current = true
    async function restore() {
      try {
        let restoredUser = session.user || null
        const plan = normalizeFlowData(await restoreDriveSession(session, {
          loadPlan: async ({ accessToken, fileId }) => parseFlowImport(await downloadFlowtreeBackup({ accessToken, fileId })),
          loadUser: getDriveUser,
          onUser: user => {
            restoredUser = user
            setDrive(previous => previous.accessToken === session.accessToken ? { ...previous, user } : previous)
          },
        }))
        replaceDataRef.current({ ...plan, tree: organizeSubscriptions(plan.tree) }, { resetHistory: true })
        setSavedContents(serializeFlowData(plan))
        setPath([])
        setDrive({ ...session, status: 'connected', user: restoredUser || { displayName: plan.profile.name }, error: '' })
        setStartupState('ready')
      } catch {
        clearDriveSession()
        setStartupState('error')
        setDrive({ status: 'error', user: null, error: 'Could not restore your Google Drive plan. Sign in again to retry; no data was uploaded.', accessToken: '', folderId: '', fileId: '' })
      }
    }
    restore()
  }, [setPath, offline])

  useEffect(() => {
    if (drive.accessToken && drive.folderId && drive.fileId) writeDriveSession({ accessToken: drive.accessToken, folderId: drive.folderId, fileId: drive.fileId, user: drive.user?.emailAddress ? drive.user : undefined })
  }, [drive.accessToken, drive.folderId, drive.fileId, drive.user])

  async function disconnectDrive() {
    if (!allowDiscard() || savingRef.current) return
    await revokeGoogleDriveAccess(drive.accessToken)
    clearDriveSession()
    const blank = createBlankFlowData()
    replaceData(blank, { resetHistory: true })
    setSavedContents(serializeFlowData(blank))
    setPath([])
    setDrive({ status: googleClientId ? 'idle' : 'unavailable', user: null, error: '', accessToken: '', folderId: '', fileId: '' })
    notify('Signed out. This tab no longer holds your plan.')
  }

  async function completeDriveSetup({ useCurrentPlan }) {
    if (!drive.accessToken || drive.status !== 'needs-plan-choice') return
    const setupPlan = useCurrentPlan ? preserveCurrentMonth(plan) : createBlankFlowData()
    if (useCurrentPlan) captureCurrentMonth()
    setDrive(previous => ({ ...previous, status: 'saving', error: '' }))
    try {
      const folder = drive.folderId ? { id: drive.folderId } : await findOrCreateFolder({ accessToken: drive.accessToken, folderName: DRIVE_FOLDER_NAME })
      const file = await uploadFlowtreeBackup({ accessToken: drive.accessToken, folderId: folder.id, fileName: DRIVE_FILE_NAME, contents: serializeFlowData(setupPlan) })
      if (!useCurrentPlan) {
        replaceData(setupPlan, { resetHistory: true })
        setPath([])
      }
      writeDriveSession({ accessToken: drive.accessToken, folderId: folder.id, fileId: file.id })
      setDrive(previous => ({ ...previous, status: 'saved', setupRequired: false, error: '', folderId: folder.id, fileId: file.id }))
      setSavedContents(serializeFlowData(setupPlan))
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

  function chooseDriveRestoreCandidate(candidateId) {
    const candidate = (drive.restoreCandidates || []).find(item => item.id === candidateId)
    if (!candidate || !drive.accessToken || !drive.user) return
    setDrive(previous => ({ ...previous, status: 'restoring', error: '' }))
    restoreDriveCandidate({ accessToken: drive.accessToken, user: drive.user, candidate, candidates: drive.restoreCandidates })
  }

  async function openDriveRevisionRecovery() {
    if (!drive.accessToken || !drive.fileId) return
    const requestId = ++recoveryRequest.current
    setDialog({ type: 'driveRevisions', requestId, loading: true, revisions: [] })
    const updateRecovery = changes => setDialog(current => current?.type === 'driveRevisions' && current.requestId === requestId ? { ...current, ...changes } : current)
    try {
      const revisions = await listFlowtreeRevisions({ accessToken: drive.accessToken, fileId: drive.fileId })
      const validRevisions = await loadRecoveryVersions(revisions, async revision => {
        const key = `${drive.fileId}:${revision.id}:${revision.modifiedTime}`
        return loadCachedRevision(recoveryCache.current, key, async () => parseFlowImport(await downloadFlowtreeRevision({
          accessToken: drive.accessToken,
          fileId: drive.fileId,
          revisionId: revision.id,
        })))
      })
      updateRecovery({ loading: false, revisions: validRevisions })
    } catch (error) {
      updateRecovery({ loading: false, error: error.message || 'Could not read earlier Google Drive versions.' })
    }
  }

  function restoreDriveRevision(revisionId) {
    const revision = (dialog?.revisions || []).find(item => item.id === revisionId)
    if (!revision?.restoredPlan || !allowDiscard()) return
    replaceData({ ...revision.restoredPlan, tree: organizeSubscriptions(revision.restoredPlan.tree) })
    setPath([])
    setDialog(null)
    notify('Earlier Google Drive version loaded. Press Save to Google Drive to keep it there.')
  }

  async function saveDrivePlan() {
    if (offline) {
      try {
        const contents = serializeFlowData(preserveCurrentMonth(plan))
        await onSaveOfflinePlan(contents)
        captureCurrentMonth()
        setSavedContents(contents)
        notify('Offline test copy saved in this browser.')
      } catch {
        notify('Could not save the offline copy. Download a JSON backup to keep your edits.')
      }
      return
    }
    if (!drive.accessToken || !drive.folderId || !drive.fileId || savingRef.current) return
    savingRef.current = true
    const contents = serializeFlowData(preserveCurrentMonth(plan))
    captureCurrentMonth()
    setDrive(previous => ({ ...previous, status: 'saving', error: '' }))
    try {
      await uploadFlowtreeBackup({ accessToken: drive.accessToken, folderId: drive.folderId, fileId: drive.fileId, fileName: DRIVE_FILE_NAME, contents })
      setSavedContents(contents)
      setDrive(previous => ({ ...previous, status: 'saved', error: '' }))
      notify('Your plan was saved to Google Drive.')
    } catch (error) {
      setDrive(previous => ({ ...previous, status: 'error', error: error.message || 'Could not save your FlowTree plan to Google Drive.' }))
      notify('Google Drive could not save your plan. Your changes are still open in this tab.')
    } finally {
      savingRef.current = false
    }
  }

  return { startupState, hasUnsavedChanges, downloadBackup, drive, connectDrive, disconnectDrive, saveDrivePlan, completeDriveSetup, cancelDriveSetup, chooseDriveRestoreCandidate, openDriveRevisionRecovery, restoreDriveRevision, driveConfigured: Boolean(googleClientId) }
}
