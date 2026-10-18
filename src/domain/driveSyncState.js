const AUTOSAVE_STATUSES = new Set(['connected', 'saving', 'saved', 'error'])

export function canAutosaveDrive({ status, accessToken, folderId, fileId }) {
  return AUTOSAVE_STATUSES.has(status) && Boolean(accessToken && folderId && fileId)
}
