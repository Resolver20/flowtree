export default function PlanRestoreScreen({ theme, state, error, onRetry, retryRestore, configured }) {
  const failed = state === 'error'
  return <main className={`plan-restore-screen energy-mode theme-${theme}`} aria-busy={!failed}>
    <section>
      <span className="material-symbols-rounded" aria-hidden="true">{failed ? 'cloud_off' : 'cloud_download'}</span>
      <h1>{failed ? 'Your plan could not be loaded' : 'Opening your saved plan…'}</h1>
      <p role={failed ? 'alert' : 'status'}>{failed ? error : 'Restoring your plan from Google Drive.'}</p>
      {failed && <button type="button" onClick={() => onRetry()} disabled={!retryRestore && !configured}>{retryRestore ? 'Retry loading plan' : 'Reconnect Google Drive'}</button>}
    </section>
  </main>
}
