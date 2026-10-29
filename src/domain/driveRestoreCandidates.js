function modifiedAt(candidate) {
  const timestamp = Date.parse(candidate.modifiedTime || '')
  return Number.isFinite(timestamp) ? timestamp : 0
}

export function orderDriveRestoreCandidates(candidates) {
  return [...candidates].sort((left, right) => modifiedAt(right) - modifiedAt(left) || left.name.localeCompare(right.name) || left.id.localeCompare(right.id))
}

export function orderValidDriveRestoreCandidates(candidates, folderName) {
  return orderDriveRestoreCandidates(candidates.filter(candidate => candidate.valid && candidate.folderName === folderName))
}

export function driveRestoreMode(candidates) {
  if (!candidates.length) return 'setup'
  return candidates.length === 1 ? 'restore' : 'choose'
}
