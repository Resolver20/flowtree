import { useEffect, useRef, useState } from 'react'
import { parseFlowImport, serializeFlowData } from '../domain/flowDataTransfer'
import { organizeSubscriptions } from '../domain/flowTree'
import { loadRecoveryVersions } from '../domain/versionRecovery'
import { driveRestoreMode, orderValidDriveRestoreCandidates } from '../domain/driveRestoreCandidates'
import { createBlankFlowData } from './useFlowData'
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
export function useGoogleDrivePlan({ plan, replaceData, dialog, setDialog, setPath, notify }) {
  const { profile, incomeSources, generalLedgers, buffer, tree } = plan
  const [drive, setDrive] = useState(() => {
    const session = readDriveSession()
    return session
      ? { status: 'restoring', user: null, error: '', ...session }
      : { status: googleClientId ? 'idle' : 'unavailable', user: null, error: '', accessToken: '', folderId: '', fileId: '' }
  })
  const replaceDataRef = useRef(replaceData)
  const hasAttemptedDriveRestore = useRef(false)

  useEffect(() => { replaceDataRef.current = replaceData }, [replaceData])

  async function restoreDriveCandidate({ accessToken, user, candidate, candidates = [] }) {
    try {
      const restoredPlan = candidate.restoredPlan || parseFlowImport(await downloadFlowtreeBackup({ accessToken, fileId: candidate.id }))
      replaceDataRef.current({ ...restoredPlan, tree: organizeSubscriptions(restoredPlan.tree) })
      setPath([])
      writeDriveSession({ accessToken, folderId: candidate.folderId, fileId: candidate.id })
      setDrive({ status: 'connected', user, error: '', accessToken, folderId: candidate.folderId, fileId: candidate.id })
      notify(`Your plan was restored from Google Drive for ${user.emailAddress || 'your Google account'}.`)
    } catch (error) {
      if (candidates.length > 1) {
        setDrive({ status: 'needs-restore-choice', user, error: error.message || 'Could not restore that Google Drive plan.', accessToken, folderId: '', fileId: '', restoreCandidates: candidates })
        setDialog({ type: 'driveSync' })
        return
      }
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
    if (!googleClientId) {
      setDrive(previous => ({ ...previous, status: 'unavailable', error: 'Google Drive sign-in has not been configured for this deployment.' }))
      return
    }
    setDrive(previous => ({ ...previous, status: 'connecting', error: '' }))
    try {
      const accessToken = await connectGoogleDrive({ clientId: googleClientId, prompt })
      const [user, discovery] = await Promise.all([
        getDriveUser({ accessToken }),
        listFlowtreeRestoreCandidates({ accessToken, folderName: DRIVE_FOLDER_NAME }),
      ])
      const candidates = await findValidDriveRestoreCandidates(accessToken, discovery.candidates)
      const mode = driveRestoreMode(candidates)
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
  }, [setPath])

  useEffect(() => {
    if (drive.accessToken && drive.folderId && drive.fileId) writeDriveSession({ accessToken: drive.accessToken, folderId: drive.folderId, fileId: drive.fileId })
  }, [drive.accessToken, drive.folderId, drive.fileId])

  async function disconnectDrive() {
    await revokeGoogleDriveAccess(drive.accessToken)
    clearDriveSession()
    replaceData(createBlankFlowData())
    setPath([])
    setDrive({ status: googleClientId ? 'idle' : 'unavailable', user: null, error: '', accessToken: '', folderId: '', fileId: '' })
    notify('Signed out. This tab no longer holds your plan.')
  }

  async function completeDriveSetup({ useCurrentPlan }) {
    if (!drive.accessToken || drive.status !== 'needs-plan-choice') return
    const plan = useCurrentPlan
      ? { profile, incomeSources, generalLedgers, buffer: Number(buffer) || 0, tree }
      : createBlankFlowData()
    setDrive(previous => ({ ...previous, status: 'saving', error: '' }))
    try {
      const folder = drive.folderId ? { id: drive.folderId } : await findOrCreateFolder({ accessToken: drive.accessToken, folderName: DRIVE_FOLDER_NAME })
      const file = await uploadFlowtreeBackup({ accessToken: drive.accessToken, folderId: folder.id, fileName: DRIVE_FILE_NAME, contents: serializeFlowData(plan) })
      if (!useCurrentPlan) {
        replaceData(plan)
        setPath([])
      }
      writeDriveSession({ accessToken: drive.accessToken, folderId: folder.id, fileId: file.id })
      setDrive(previous => ({ ...previous, status: 'saved', setupRequired: false, error: '', folderId: folder.id, fileId: file.id }))
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
    setDrive(previous => ({ ...previous, status: 'restoring', error: '' }))
    try {
      const revisions = await listFlowtreeRevisions({ accessToken: drive.accessToken, fileId: drive.fileId })
      const validRevisions = await loadRecoveryVersions(revisions, async revision =>
        parseFlowImport(await downloadFlowtreeRevision({
          accessToken: drive.accessToken,
          fileId: drive.fileId,
          revisionId: revision.id,
        })),
      )
      setDrive(previous => ({ ...previous, status: 'connected', error: '' }))
      if (!validRevisions.length) {
        notify('No earlier valid FlowTree versions were found in Google Drive.')
        return
      }
      setDialog({ type: 'driveRevisions', revisions: validRevisions })
    } catch (error) {
      setDrive(previous => ({ ...previous, status: 'connected', error: error.message || 'Could not read earlier Google Drive versions.' }))
      notify('Could not read earlier Google Drive versions.')
    }
  }

  function restoreDriveRevision(revisionId) {
    const revision = (dialog?.revisions || []).find(item => item.id === revisionId)
    if (!revision?.restoredPlan) return
    replaceData({ ...revision.restoredPlan, tree: organizeSubscriptions(revision.restoredPlan.tree) })
    setPath([])
    setDialog(null)
    notify('Earlier Google Drive version loaded. Press Save to Google Drive to keep it there.')
  }

  async function saveDrivePlan() {
    if (!drive.accessToken || !drive.folderId || !drive.fileId || drive.status === 'saving') return
    const contents = serializeFlowData({ profile, incomeSources, generalLedgers, buffer: Number(buffer) || 0, tree })
    setDrive(previous => ({ ...previous, status: 'saving', error: '' }))
    try {
      await uploadFlowtreeBackup({ accessToken: drive.accessToken, folderId: drive.folderId, fileId: drive.fileId, fileName: DRIVE_FILE_NAME, contents })
      setDrive(previous => ({ ...previous, status: 'saved', error: '' }))
      notify('Your plan was saved to Google Drive.')
    } catch (error) {
      setDrive(previous => ({ ...previous, status: 'error', error: error.message || 'Could not save your FlowTree plan to Google Drive.' }))
      notify('Google Drive could not save your plan. Your changes are still open in this tab.')
    }
  }

  return { drive, connectDrive, disconnectDrive, saveDrivePlan, completeDriveSetup, cancelDriveSetup, chooseDriveRestoreCandidate, openDriveRevisionRecovery, restoreDriveRevision, driveConfigured: Boolean(googleClientId) }
}
