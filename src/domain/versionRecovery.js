import { planVersionChanges } from './planVersionChanges.js'

export const RECOVERY_VERSION_LIMIT = 5

export async function loadCachedRevision(cache, key, load) {
  if (cache.has(key)) return cache.get(key)
  if (cache.size >= 12) cache.delete(cache.keys().next().value)
  const pending = Promise.resolve().then(load)
  cache.set(key, pending)
  try {
    return await pending
  } catch (error) {
    if (cache.get(key) === pending) cache.delete(key)
    throw error
  }
}

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
