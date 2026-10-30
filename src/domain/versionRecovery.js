import { planVersionChanges } from './planVersionChanges.js'

export const RECOVERY_VERSION_LIMIT = 5

// Load only enough valid snapshots for the visible list plus its comparison baseline.
// Small batches avoid flooding Drive with requests when a file has a long history.
export async function loadRecoveryVersions(revisions, loadPlan) {
  const available = []
  const needed = RECOVERY_VERSION_LIMIT + 1
  for (let offset = 0; offset < revisions.length && available.length < needed;) {
    const batch = revisions.slice(offset, offset + needed - available.length)
    offset += batch.length
    const checked = await Promise.all(batch.map(async revision => {
      try {
        return { ...revision, restoredPlan: await loadPlan(revision) }
      } catch {
        return null
      }
    }))
    available.push(...checked.filter(Boolean))
  }
  return available.slice(0, RECOVERY_VERSION_LIMIT).map((revision, index) => ({
    ...revision,
    changes: planVersionChanges(available[index + 1]?.restoredPlan, revision.restoredPlan),
  }))
}
