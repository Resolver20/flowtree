export default function GoogleDriveLogin({ status, error, configured, onConnect }) {
  const busy = status === 'connecting'
  return <main className="drive-login">
    <div className="drive-login-shell">
      <header className="drive-login-brand">
        <span className="drive-login-mark" aria-hidden="true">✳</span>
        <span>Flowtree</span>
      </header>
      <section className="drive-login-intro" aria-labelledby="drive-login-title">
        <p className="drive-login-eyebrow">MONTHLY PLANNING, MADE QUIET</p>
        <h1 id="drive-login-title">Give every part of your money a place to go.</h1>
        <p>Flowtree turns your monthly plan into one clear path—from income to the things you are planning for.</p>
        <ul className="drive-login-points">
          <li><span className="material-symbols-rounded" aria-hidden="true">account_tree</span><span>See income, categories, and destinations together.</span></li>
          <li><span className="material-symbols-rounded" aria-hidden="true">calendar_month</span><span>Keep every target in a monthly view.</span></li>
          <li><span className="material-symbols-rounded" aria-hidden="true">cloud_done</span><span>Keep your plan in your own Google Drive.</span></li>
        </ul>
      </section>
      <section className="drive-login-card" aria-label="Open your Flowtree plan">
        <p className="drive-login-eyebrow">YOUR PRIVATE PLAN</p>
        <h2>Pick up where you left off.</h2>
        <p>Sign in to restore your plan from a private <strong>gpt</strong> folder, then save changes there as you go.</p>
        {error && <p className="drive-login-error" role="alert">{error}</p>}
        <button className="drive-login-button" type="button" disabled={!configured || busy} onClick={onConnect}>
          <span className="drive-login-google" aria-hidden="true">G</span>
          {busy ? 'Connecting to Google Drive…' : 'Continue with Google'}
        </button>
        {!configured && <p className="drive-login-hint">Google Drive sign-in has not been configured for this deployment yet.</p>}
        <small>Flowtree uses Google Drive only. It does not read Gmail, Calendar, Contacts, or bank accounts.</small>
      </section>
      <aside className="drive-login-preview" aria-hidden="true">
        <p>ONE CALM MONTHLY VIEW</p>
        <div className="drive-preview-canvas">
          <div className="drive-preview-node drive-preview-income"><span className="material-symbols-rounded">payments</span>Income</div>
          <div className="drive-preview-line drive-preview-line-one" />
          <div className="drive-preview-line drive-preview-line-two" />
          <div className="drive-preview-node drive-preview-plan"><span className="material-symbols-rounded">account_balance_wallet</span>Monthly plan</div>
          <div className="drive-preview-node drive-preview-cash"><span className="material-symbols-rounded">receipt_long</span>Cash flow</div>
          <div className="drive-preview-node drive-preview-goals"><span className="material-symbols-rounded">trending_up</span>Long-term growth</div>
        </div>
      </aside>
    </div>
  </main>
}
