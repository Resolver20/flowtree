import { useState } from 'react'

export default function TreeHeader({ breadcrumbs, expandAll, view, profile, driveUser, driveStatus, driveConfigured, theme, onReturnToRoot, onNavigate, onConnectDrive, onEditJson, onShowSinkingFunds, onShowLoans, onShowGoals, onToggleExpandAll, onToggleTheme }) {
  const homeActive = view === 'home' && !breadcrumbs.length && !expandAll
  const [accountOpen, setAccountOpen] = useState(false)
  const connected = Boolean(driveUser)
  return <>
    <aside className="energy-sidebar" aria-label="FlowTree navigation">
      <header className="sidebar-brand">
        <button className="energy-brand" onClick={onReturnToRoot} aria-label="Return to home"><span className="flowtree-mark material-symbols-rounded" aria-hidden="true">account_tree</span><span>FlowTree</span></button>
      </header>
      <nav className="sidebar-nav" aria-label="Plan sections">
        <span className="sidebar-section-label">PLAN</span>
        <button type="button" className={homeActive ? 'is-active' : ''} onClick={onReturnToRoot} aria-current={homeActive ? 'page' : undefined} aria-label="Home">
          <span className="material-symbols-rounded" aria-hidden="true">home</span>
          <span>Home</span>
        </button>
        <button type="button" className={view === 'sinking' ? 'is-active' : ''} onClick={onShowSinkingFunds} aria-current={view === 'sinking' ? 'page' : undefined} aria-label="Sinking funds">
          <span className="material-symbols-rounded" aria-hidden="true">savings</span>
          <span>Sinking funds</span>
        </button>
        <button type="button" className={view === 'loans' ? 'is-active' : ''} onClick={onShowLoans} aria-current={view === 'loans' ? 'page' : undefined} aria-label="Loans">
          <span className="material-symbols-rounded" aria-hidden="true">account_balance</span>
          <span>Loans</span>
        </button>
        <button type="button" className={view === 'goals' ? 'is-active' : ''} onClick={onShowGoals} aria-current={view === 'goals' ? 'page' : undefined} aria-label="Life goals">
          <span className="material-symbols-rounded" aria-hidden="true">flag</span>
          <span>Life goals</span>
        </button>
        <button type="button" className={expandAll ? 'is-active' : ''} onClick={onToggleExpandAll} aria-current={expandAll ? 'page' : undefined}>
          <span className="material-symbols-rounded" aria-hidden="true">account_tree</span>
          <span>Full tree overview</span>
        </button>
      </nav>
      <button type="button" className="sidebar-profile" onClick={() => setAccountOpen(open => !open)} aria-expanded={accountOpen} aria-controls="account-menu" aria-label="Open account menu">
        {driveUser?.photoLink
          ? <img className="sidebar-avatar-image" src={driveUser.photoLink} alt="" />
          : <span className="sidebar-avatar material-symbols-rounded" aria-hidden="true">person</span>}
        <span><strong>{driveUser?.displayName || profile.name}</strong><small>{driveUser?.emailAddress || 'Sign in to Google Drive'}</small></span>
      </button>
      {accountOpen && <section id="account-menu" className="account-menu" aria-label="Account">
        <div className="account-menu-identity">
          <strong>{driveUser?.displayName || profile.name}</strong>
          <small>{driveUser?.emailAddress || 'Your plan is not connected to Google Drive yet.'}</small>
        </div>
        <button type="button" className="account-menu-theme" onClick={onToggleTheme} aria-pressed={theme === 'dark'}>
          <span className="material-symbols-rounded" aria-hidden="true">{theme === 'dark' ? 'light_mode' : 'dark_mode'}</span>
          <span>{theme === 'dark' ? 'Use light mode' : 'Use dark mode'}</span>
        </button>
        {connected ? <>
          <small className="account-menu-status">{driveStatus === 'saving' ? 'Saving changes to Google Drive…' : 'Your plan is stored in this Google Drive account.'}</small>
          <button type="button" onClick={onEditJson}>Edit plan JSON</button>
          <button type="button" onClick={() => onConnectDrive({ prompt: 'select_account consent' })}>Add or switch account</button>
        </> : <>
          <small className="account-menu-status">Sign in to load your saved FlowTree plan.</small>
          <button type="button" className="account-menu-primary" disabled={!driveConfigured || driveStatus === 'connecting'} onClick={() => onConnectDrive({ prompt: 'select_account consent' })}>{driveStatus === 'connecting' ? 'Connecting…' : 'Sign in with Google'}</button>
        </>}
      </section>}
    </aside>
    <nav className="energy-breadcrumbs" aria-label="Flow location">
      <button onClick={onReturnToRoot}>Whole tree</button>
      {breadcrumbs.map(crumb => <span key={crumb.node.id}> / <button onClick={() => onNavigate(crumb.path)}>{crumb.node.name}</button></span>)}
    </nav>
  </>
}
