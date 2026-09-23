const DRIVE_API = 'https://www.googleapis.com/drive/v3'
const GIS_SCRIPT = 'https://accounts.google.com/gsi/client'
export const GOOGLE_DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file'

let identityScript

function loadIdentityScript() {
  if (window.google?.accounts?.oauth2) return Promise.resolve()
  if (identityScript) return identityScript
  identityScript = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = GIS_SCRIPT
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Google Identity Services could not be loaded.'))
    document.head.append(script)
  })
  return identityScript
}

async function driveRequest(path, accessToken, options = {}) {
  const response = await fetch(`${DRIVE_API}${path}`, {
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

export async function connectGoogleDrive({ clientId, scope = GOOGLE_DRIVE_SCOPE } = {}) {
  if (!clientId) throw new Error('Set VITE_GOOGLE_CLIENT_ID before connecting Google Drive.')
  await loadIdentityScript()
  return new Promise((resolve, reject) => {
    const tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope,
      callback: response => {
        if (response.error) reject(new Error(response.error_description || 'Google Drive authorization was not completed.'))
        else resolve(response.access_token)
      },
      error_callback: error => reject(new Error(error?.type || 'Google Drive authorization was not completed.')),
    })
    tokenClient.requestAccessToken({ prompt: 'consent' })
  })
}

export async function findFlowtreeBackup({ accessToken, folderId, fileName = 'flowtree-plan.json' }) {
  if (!accessToken || !folderId) throw new Error('A Google Drive access token and folder ID are required.')
  const query = encodeURIComponent(`'${folderId}' in parents and name = '${fileName.replaceAll("'", "\\'")}' and trashed = false`)
  const result = await driveRequest(`/files?q=${query}&spaces=drive&fields=files(id,name,modifiedTime,mimeType)&pageSize=10`, accessToken)
  return result.files?.[0] || null
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
  return driveRequest(endpoint, accessToken, { method: fileId ? 'PATCH' : 'POST', headers: { 'Content-Type': multipart.contentType }, body: multipart.body })
}

export async function downloadFlowtreeBackup({ accessToken, fileId } = {}) {
  if (!accessToken || !fileId) throw new Error('A Google Drive access token and file ID are required.')
  const response = await fetch(`${DRIVE_API}/files/${encodeURIComponent(fileId)}?alt=media`, { headers: { Authorization: `Bearer ${accessToken}` } })
  if (!response.ok) throw new Error(`Google Drive download failed (${response.status}).`)
  return response.text()
}

export function revokeGoogleDriveAccess(accessToken) {
  if (!accessToken || !window.google?.accounts?.oauth2) return Promise.resolve()
  return new Promise(resolve => window.google.accounts.oauth2.revoke(accessToken, resolve))
}
