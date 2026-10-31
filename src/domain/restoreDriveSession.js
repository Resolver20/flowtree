// Account presentation must not delay or prevent restoring the financial plan.
// Profile failures are non-fatal; plan failures must remain visible to the caller.
export async function restoreDriveSession(session, { loadPlan, loadUser, onUser }) {
  if (!session.user) {
    Promise.resolve().then(() => loadUser(session)).then(onUser).catch(() => {})
  }
  return loadPlan(session)
}

export const requiresDriveSignIn = error => error?.status === 401
