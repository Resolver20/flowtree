import { useEffect, useRef, useState } from 'react'

export default function TreeHeader({ breadcrumbs, expandAll, view, profile, driveUser, driveStatus, driveError, driveConfigured, theme, onReturnToRoot, onNavigate, onConnectDrive, onEditJson, onShowSinkingFunds, onShowLoans, onShowGoals, onShowInvestments, onShowGeneralLedger, onToggleExpandAll, onToggleTheme }) {
  const homeActive = view === 'home' && !breadcrumbs.length && !expandAll
  const treeView = view === 'home' || view === 'sinking'
  const overviewLabel = expandAll
    ? 'Collapse tree'
    : view === 'sinking'
      ? 'Expand sinking funds'
      : 'Full tree overview'
  const [accountOpen, setAccountOpen] = useState(false)
  const accountRef = useRef(null)
  const connected = Boolean(driveUser)

  useEffect(() => {
    if (!accountOpen) return undefined
    function closeOnOutsidePress(event) {
      if (!accountRef.current?.contains(event.target)) setAccountOpen(false)
    }
    function closeOnEscape(event) {
      if (event.key === 'Escape') setAccountOpen(false)
    }
    document.addEventListener('pointerdown', closeOnOutsidePress)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePress)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [accountOpen])

  function closeMenuThen(action) {
    setAccountOpen(false)
    action()
  }

  return <>
    <aside ref={accountRef} className="energy-sidebar" aria-label="FlowTree navigation">
      <header className="sidebar-brand">
        <button className="energy-brand" onClick={() => closeMenuThen(onReturnToRoot)} aria-label="Return to home"><span className="flowtree-mark material-symbols-rounded" aria-hidden="true">account_tree</span><span>FlowTree</span></button>
      </header>
      <nav className="sidebar-nav" aria-label="Plan sections">
        <span className="sidebar-section-label">PLAN</span>
        <button type="button" className={homeActive ? 'is-active' : ''} onClick={() => closeMenuThen(onReturnToRoot)} aria-current={homeActive ? 'page' : undefined}>
          <span className="material-symbols-rounded" aria-hidden="true">home</span>
          <span>Home</span>
        </button>
        <button type="button" className={view === 'sinking' ? 'is-active' : ''} onClick={() => closeMenuThen(onShowSinkingFunds)} aria-current={view === 'sinking' ? 'page' : undefined}>
          <span className="material-symbols-rounded" aria-hidden="true">savings</span>
          <span>Sinking funds</span>
        </button>
        <button type="button" className={view === 'loans' ? 'is-active' : ''} onClick={() => closeMenuThen(onShowLoans)} aria-current={view === 'loans' ? 'page' : undefined}>
          <span className="material-symbols-rounded" aria-hidden="true">account_balance</span>
          <span>Loans</span>
        </button>
        <button type="button" className={view === 'goals' ? 'is-active' : ''} onClick={() => closeMenuThen(onShowGoals)} aria-current={view === 'goals' ? 'page' : undefined}>
          <span className="material-symbols-rounded" aria-hidden="true">flag</span>
          <span>Life goals</span>
        </button>
        <button type="button" className={view === 'investments' ? 'is-active' : ''} onClick={() => closeMenuThen(onShowInvestments)} aria-current={view === 'investments' ? 'page' : undefined}>
          <span className="material-symbols-rounded" aria-hidden="true">trending_up</span>
          <span>Investments</span>
        </button>
        <button type="button" className={view === 'ledger' ? 'is-active' : ''} onClick={() => closeMenuThen(onShowGeneralLedger)} aria-current={view === 'ledger' ? 'page' : undefined}>
          <span className="material-symbols-rounded" aria-hidden="true">receipt_long</span>
          <span>General ledger</span>
        </button>
        <button type="button" className={expandAll ? 'is-active' : ''} onClick={() => closeMenuThen(onToggleExpandAll)} aria-current={expandAll ? 'page' : undefined} aria-label={treeView ? overviewLabel : 'Open full tree overview'}>
          <span className="material-symbols-rounded" aria-hidden="true">account_tree</span>
          <span>{overviewLabel}</span>
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
        <button type="button" className="account-menu-theme" onClick={() => closeMenuThen(onToggleTheme)} aria-pressed={theme === 'dark'}>
          <span className="material-symbols-rounded" aria-hidden="true">{theme === 'dark' ? 'light_mode' : 'dark_mode'}</span>
          <span>{theme === 'dark' ? 'Use light mode' : 'Use dark mode'}</span>
        </button>
        {connected ? <>
          <small className="account-menu-status">{driveStatus === 'saving' ? 'Saving changes to Google Drive…' : 'Your plan is stored in this Google Drive account.'}</small>
          <button type="button" onClick={() => closeMenuThen(onEditJson)}>Edit plan JSON</button>
          <button type="button" onClick={() => closeMenuThen(() => onConnectDrive({ prompt: 'select_account consent' }))}>Add or switch account</button>
        </> : <>
          <small className="account-menu-status" role={driveError ? 'alert' : undefined}>{driveError || 'Sign in to load your saved FlowTree plan.'}</small>
          <button type="button" className="account-menu-primary" disabled={!driveConfigured || driveStatus === 'connecting'} onClick={() => closeMenuThen(() => onConnectDrive({ prompt: 'select_account consent' }))}>{driveStatus === 'connecting' ? 'Connecting…' : 'Sign in with Google'}</button>
        </>}
      </section>}
    </aside>
    <nav className="energy-breadcrumbs" aria-label="Flow location">
      {expandAll
        ? <button type="button" className="exit-full-preview" onClick={onToggleExpandAll}><span className="material-symbols-rounded" aria-hidden="true">close_fullscreen</span>Exit full preview</button>
        : <><button onClick={onReturnToRoot}>Whole tree</button>
          {breadcrumbs.map(crumb => <span key={crumb.node.id}> / <button onClick={() => onNavigate(crumb.path)}>{crumb.node.name}</button></span>)}</>}
    </nav>
  </>
}
