import { orderDriveRestoreCandidates } from '../domain/driveRestoreCandidates.js'

const DRIVE_API = 'https://www.googleapis.com/drive/v3'
const DRIVE_UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3'
const GIS_SCRIPT = 'https://accounts.google.com/gsi/client'
const GIS_LOAD_TIMEOUT_MS = 12_000
export const GOOGLE_DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file'

let identityScript

export function isGoogleDriveSignInReady() {
  return Boolean(window.google?.accounts?.oauth2)
}

export function prepareGoogleDriveSignIn() {
  if (isGoogleDriveSignInReady()) return Promise.resolve()
  if (identityScript) return identityScript
  identityScript = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    const fail = message => {
      window.clearTimeout(timeout)
      script.remove()
      reject(new Error(message))
    }
    const timeout = window.setTimeout(() => fail('Google sign-in did not load. Check your connection or browser blockers, then try again.'), GIS_LOAD_TIMEOUT_MS)
    script.src = GIS_SCRIPT
    script.async = true
    script.defer = true
    script.onload = () => {
      window.clearTimeout(timeout)
      if (isGoogleDriveSignInReady()) resolve()
      else fail('Google sign-in could not initialize. Please try again.')
    }
    script.onerror = () => {
      fail('Google sign-in could not be loaded. Check your connection or browser blockers, then try again.')
    }
    document.head.append(script)
  })
  return identityScript.catch(error => {
    // Permit a retry after a blocked network request or a browser extension
    // prevents Google's identity script from loading.
    identityScript = undefined
    throw error
  })
}

async function driveRequest(path, accessToken, { baseUrl = DRIVE_API, ...options } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...options.headers,
    },
  })
  if (!response.ok) {
    let message = `Google Drive request failed (${response.status}).`
    try {
      const body = await response.json()
      message = body.error?.message || message
    } catch {
      // Keep the status-based message when Drive does not return JSON.
    }
    throw new Error(message)
  }
  return response.status === 204 ? null : response.json()
}

export async function connectGoogleDrive({ clientId, scope = GOOGLE_DRIVE_SCOPE, prompt = 'consent', loginHint } = {}) {
  if (!clientId) throw new Error('Set VITE_GOOGLE_CLIENT_ID before connecting Google Drive.')
  // Opening the popup must stay in the button's user gesture. Prepare the SDK
  // before enabling sign-in rather than awaiting a network load here.
  if (!isGoogleDriveSignInReady()) throw new Error('Google sign-in is still loading. Please try again shortly.')
  return new Promise((resolve, reject) => {
    const tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope,
      ...(loginHint ? { login_hint: loginHint } : {}),
      callback: response => {
        if (response.error) reject(new Error(response.error_description || 'Google Drive authorization was not completed.'))
        else resolve(response.access_token)
      },
      error_callback: error => {
        const message = error?.type === 'popup_failed_to_open'
          ? 'Your browser blocked the Google sign-in window. Allow popups for FlowTree, then try again.'
          : error?.type === 'popup_closed'
            ? 'Google sign-in was closed before it finished. Please try again.'
            : 'Google sign-in could not open. Please try again.'
        reject(new Error(message))
      },
    })
    tokenClient.requestAccessToken({ prompt })
  })
}

export async function findFlowtreeBackup({ accessToken, folderId, fileName = 'flowtree-plan.json' }) {
  if (!accessToken || !folderId) throw new Error('A Google Drive access token and folder ID are required.')
  const query = encodeURIComponent(`'${folderId}' in parents and name = '${fileName.replaceAll("'", "\\'")}' and trashed = false`)
  const result = await driveRequest(`/files?q=${query}&spaces=drive&fields=files(id,name,modifiedTime,mimeType)&pageSize=10`, accessToken)
  return result.files?.[0] || null
}

export async function listFlowtreeRestoreCandidates({ accessToken, folderName = 'gpt' }) {
  if (!accessToken) throw new Error('A Google Drive access token is required.')
  const folderQuery = encodeURIComponent(`name = '${folderName.replaceAll("'", "\\'")}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`)
  const folderResult = await driveRequest(`/files?q=${folderQuery}&spaces=drive&fields=files(id,name,modifiedTime,mimeType)&pageSize=100&orderBy=modifiedTime%20desc`, accessToken)
  const folders = folderResult.files || []
  const fileResults = await Promise.all(folders.map(async folder => {
    // Older Flowtree releases did not consistently use the current file name.
    // Restrict discovery to JSON within the user's dedicated gpt folder, then let
    // the import parser decide which files are valid Flowtree plans.
    const fileQuery = encodeURIComponent(`'${folder.id}' in parents and mimeType = 'application/json' and trashed = false`)
    const result = await driveRequest(`/files?q=${fileQuery}&spaces=drive&fields=files(id,name,modifiedTime,mimeType)&pageSize=100&orderBy=modifiedTime%20desc`, accessToken)
    return (result.files || []).map(file => ({ ...file, folderId: folder.id, folderName: folder.name }))
  }))
  return { folders, candidates: orderDriveRestoreCandidates(fileResults.flat()) }
}

export async function getDriveUser({ accessToken } = {}) {
  if (!accessToken) throw new Error('A Google Drive access token is required.')
  const result = await driveRequest('/about?fields=user(displayName,emailAddress,photoLink)', accessToken)
  return result.user || {}
}

export async function findOrCreateFolder({ accessToken, folderName = 'gpt' } = {}) {
  if (!accessToken) throw new Error('A Google Drive access token is required.')
  const query = encodeURIComponent(`name = '${folderName.replaceAll("'", "\\'")}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`)
  const result = await driveRequest(`/files?q=${query}&spaces=drive&fields=files(id,name,mimeType)&pageSize=10`, accessToken)
  if (result.files?.[0]) return result.files[0]
  return driveRequest('/files?fields=id,name,mimeType', accessToken, {
    method: 'POST',
    body: JSON.stringify({ name: folderName, mimeType: 'application/vnd.google-apps.folder' }),
  })
}

function multipartBody(metadata, contents) {
  const boundary = `flowtree-${crypto.randomUUID()}`
  return {
    body: `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n${contents}\r\n--${boundary}--`,
    contentType: `multipart/related; boundary=${boundary}`,
  }
}

export async function uploadFlowtreeBackup({ accessToken, folderId, contents, fileName = 'flowtree-plan.json', fileId } = {}) {
  if (!accessToken || !folderId || typeof contents !== 'string') throw new Error('A token, folder ID, and JSON contents are required.')
  const metadata = { name: fileName, mimeType: 'application/json', ...(fileId ? {} : { parents: [folderId] }) }
  const multipart = multipartBody(metadata, contents)
  const endpoint = fileId ? `/files/${encodeURIComponent(fileId)}?uploadType=multipart&fields=id,name,modifiedTime,mimeType` : '/files?uploadType=multipart&fields=id,name,modifiedTime,mimeType'
  return driveRequest(endpoint, accessToken, {
    baseUrl: DRIVE_UPLOAD_API,
    method: fileId ? 'PATCH' : 'POST',
    headers: { 'Content-Type': multipart.contentType },
    body: multipart.body,
  })
}

export async function downloadFlowtreeBackup({ accessToken, fileId } = {}) {
  if (!accessToken || !fileId) throw new Error('A Google Drive access token and file ID are required.')
  const response = await fetch(`${DRIVE_API}/files/${encodeURIComponent(fileId)}?alt=media`, { headers: { Authorization: `Bearer ${accessToken}` } })
  if (!response.ok) throw new Error(`Google Drive download failed (${response.status}).`)
  return response.text()
}

export async function listFlowtreeRevisions({ accessToken, fileId } = {}) {
  if (!accessToken || !fileId) throw new Error('A Google Drive access token and file ID are required.')
  const revisions = []
  let pageToken = ''
  do {
    const query = new URLSearchParams({ fields: 'nextPageToken,revisions(id,modifiedTime,originalFilename,size)', pageSize: '100' })
    if (pageToken) query.set('pageToken', pageToken)
    const result = await driveRequest(`/files/${encodeURIComponent(fileId)}/revisions?${query}`, accessToken)
    revisions.push(...(result.revisions || []))
    pageToken = result.nextPageToken || ''
  } while (pageToken)
  return revisions.sort((left, right) => Date.parse(right.modifiedTime || '') - Date.parse(left.modifiedTime || ''))
}

export async function downloadFlowtreeRevision({ accessToken, fileId, revisionId } = {}) {
  if (!accessToken || !fileId || !revisionId) throw new Error('A Google Drive access token, file ID, and revision ID are required.')
  const response = await fetch(`${DRIVE_API}/files/${encodeURIComponent(fileId)}/revisions/${encodeURIComponent(revisionId)}?alt=media`, { headers: { Authorization: `Bearer ${accessToken}` } })
  if (!response.ok) throw new Error(`Google Drive revision download failed (${response.status}).`)
  return response.text()
}

export function revokeGoogleDriveAccess(accessToken) {
  if (!accessToken || !window.google?.accounts?.oauth2) return Promise.resolve()
  return new Promise(resolve => window.google.accounts.oauth2.revoke(accessToken, resolve))
}
