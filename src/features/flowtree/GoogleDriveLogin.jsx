export default function GoogleDriveLogin({ status, error, configured, onConnect }) {
  const busy = status === 'connecting'
  return <main className="drive-login">
    <section className="drive-login-card" aria-labelledby="drive-login-title">
      <div className="drive-login-mark" aria-hidden="true">✳</div>
      <p className="drive-login-eyebrow">FLOWTREE</p>
      <h1 id="drive-login-title">Your plan, in your Drive.</h1>
      <p>Sign in with Google to open your personal Flowtree plan. Your plan is restored from a private <strong>gpt</strong> folder and saved there as you make changes.</p>
      {error && <p className="drive-login-error" role="alert">{error}</p>}
      <button className="drive-login-button" type="button" disabled={!configured || busy} onClick={onConnect}>
        <span className="drive-login-google" aria-hidden="true">G</span>
        {busy ? 'Connecting to Google Drive…' : 'Continue with Google'}
      </button>
      {!configured && <p className="drive-login-hint">Google Drive sign-in has not been configured for this deployment yet.</p>}
      <small>Flowtree uses Google Drive only. It does not read Gmail, Calendar, Contacts, or bank accounts.</small>
    </section>
  </main>
}
