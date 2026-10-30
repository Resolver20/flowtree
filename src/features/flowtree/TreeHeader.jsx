import { useEffect, useRef, useState } from 'react'

export default function TreeHeader({ breadcrumbs, expandAll, view, profile, driveUser, driveStatus, driveError, driveConfigured, theme, canUndo, canRedo, onUndo, onRedo, onReturnToRoot, onNavigate, onConnectDrive, onDisconnectDrive, onEditJson, onShowSinkingFunds, onShowLoans, onShowGoals, onShowRecurringPayments, onShowInvestments, onShowGeneralLedger, onToggleTheme }) {
  const homeActive = view === 'home'
  const [accountOpen, setAccountOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const accountMenuRef = useRef(null)
  const desktopAccountButtonRef = useRef(null)
  const mobileAccountButtonRef = useRef(null)
  const mobileMoreRef = useRef(null)
  const mobileMoreButtonRef = useRef(null)
  const connected = Boolean(driveUser)

  useEffect(() => {
    if (!accountOpen) return undefined
    function closeOnOutsidePress(event) {
      const accountControls = [accountMenuRef, desktopAccountButtonRef, mobileAccountButtonRef]
      if (!accountControls.some(ref => ref.current?.contains(event.target))) setAccountOpen(false)
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

  function closeMore() {
    setMoreOpen(false)
    window.requestAnimationFrame(() => mobileMoreButtonRef.current?.focus())
  }

  useEffect(() => {
    if (!moreOpen) return undefined
    const closeOnEscape = event => {
      if (event.key === 'Escape') closeMore()
    }
    const keepFocusInMenu = event => {
      if (event.key !== 'Tab') return
      const controls = [...(mobileMoreRef.current?.querySelectorAll('button:not(:disabled)') || [])]
      if (!controls.length) return
      const first = controls[0]
      const last = controls.at(-1)
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    const closeOnOutsidePress = event => {
      if (!mobileMoreRef.current?.contains(event.target) && !mobileMoreButtonRef.current?.contains(event.target)) closeMore()
    }
    const firstControl = mobileMoreRef.current?.querySelector('button')
    firstControl?.focus()
    document.addEventListener('keydown', closeOnEscape)
    document.addEventListener('keydown', keepFocusInMenu)
    document.addEventListener('pointerdown', closeOnOutsidePress)
    return () => {
      document.removeEventListener('keydown', closeOnEscape)
      document.removeEventListener('keydown', keepFocusInMenu)
      document.removeEventListener('pointerdown', closeOnOutsidePress)
    }
  }, [moreOpen])

  function closeMenuThen(action) {
    setAccountOpen(false)
    setMoreOpen(false)
    action()
  }

  return <>
    <aside className="energy-sidebar" aria-label="FlowTree navigation">
      <header className="sidebar-brand">
        <button className="energy-brand" onClick={() => closeMenuThen(onReturnToRoot)} aria-label="Return to home"><span className="flowtree-mark material-symbols-rounded" aria-hidden="true">account_tree</span><span>FlowTree</span></button>
        <div className="sidebar-history" aria-label="Plan history">
          <button type="button" onClick={onUndo} disabled={!canUndo} aria-label="Undo last plan change" title="Undo last plan change"><span className="material-symbols-rounded" aria-hidden="true">undo</span></button>
          <button type="button" onClick={onRedo} disabled={!canRedo} aria-label="Redo plan change" title="Redo plan change"><span className="material-symbols-rounded" aria-hidden="true">redo</span></button>
        </div>
      </header>
      <nav className="sidebar-nav" aria-label="Plan sections">
        <span className="sidebar-section-label">PLAN</span>
        <button type="button" className={homeActive ? 'is-active' : ''} onClick={() => closeMenuThen(onReturnToRoot)} aria-current={homeActive ? 'page' : undefined} aria-label="Home">
          <span className="material-symbols-rounded" aria-hidden="true">home</span>
          <span>Home</span>
        </button>
        <button type="button" className={view === 'sinking' ? 'is-active' : ''} onClick={() => closeMenuThen(onShowSinkingFunds)} aria-current={view === 'sinking' ? 'page' : undefined} aria-label="Sinking funds">
          <span className="material-symbols-rounded" aria-hidden="true">savings</span>
          <span>Sinking funds</span>
        </button>
        <button type="button" className={view === 'loans' ? 'is-active' : ''} onClick={() => closeMenuThen(onShowLoans)} aria-current={view === 'loans' ? 'page' : undefined} aria-label="Loans">
          <span className="material-symbols-rounded" aria-hidden="true">account_balance</span>
          <span>Loans</span>
        </button>
        <button type="button" className={view === 'goals' ? 'is-active' : ''} onClick={() => closeMenuThen(onShowGoals)} aria-current={view === 'goals' ? 'page' : undefined} aria-label="Life goals">
          <span className="material-symbols-rounded" aria-hidden="true">flag</span>
          <span>Life goals</span>
        </button>
        <button type="button" className={view === 'recurring' ? 'is-active' : ''} onClick={() => closeMenuThen(onShowRecurringPayments)} aria-current={view === 'recurring' ? 'page' : undefined} aria-label="Recurring payments">
          <span className="material-symbols-rounded" aria-hidden="true">event_repeat</span>
          <span>Recurring payments</span>
        </button>
        <button type="button" className={view === 'investments' ? 'is-active' : ''} onClick={() => closeMenuThen(onShowInvestments)} aria-current={view === 'investments' ? 'page' : undefined} aria-label="Investments">
          <span className="material-symbols-rounded" aria-hidden="true">trending_up</span>
          <span>Investments</span>
        </button>
        <button type="button" className={view === 'ledger' ? 'is-active' : ''} onClick={() => closeMenuThen(onShowGeneralLedger)} aria-current={view === 'ledger' ? 'page' : undefined} aria-label="General ledger">
          <span className="material-symbols-rounded" aria-hidden="true">receipt_long</span>
          <span>General ledger</span>
        </button>
      </nav>
      <button ref={desktopAccountButtonRef} type="button" className="sidebar-profile" onClick={() => setAccountOpen(open => !open)} aria-expanded={accountOpen} aria-controls="account-menu" aria-label="Open account menu">
        {driveUser?.photoLink
          ? <img className="sidebar-avatar-image" src={driveUser.photoLink} alt="" />
          : <span className="sidebar-avatar material-symbols-rounded" aria-hidden="true">person</span>}
        <span><strong>{driveUser?.displayName || profile.name}</strong><small>{driveUser?.emailAddress || 'Sign in to Google Drive'}</small></span>
      </button>
    </aside>
    <button ref={mobileAccountButtonRef} type="button" className="mobile-account-trigger" onClick={() => setAccountOpen(open => !open)} aria-expanded={accountOpen} aria-controls="account-menu" aria-label={connected ? 'Open account menu' : 'Sign in to Google Drive'}>
      {driveUser?.photoLink
        ? <img className="sidebar-avatar-image" src={driveUser.photoLink} alt="" />
        : <span className="sidebar-avatar material-symbols-rounded" aria-hidden="true">person</span>}
    </button>
    {accountOpen && <section ref={accountMenuRef} id="account-menu" className="account-menu" aria-label="Account">
      <div className="account-menu-identity">
        <strong>{driveUser?.displayName || profile.name}</strong>
        <small>{driveUser?.emailAddress || 'Your plan is not connected to Google Drive yet.'}</small>
      </div>
      <button type="button" className="account-menu-theme" onClick={() => closeMenuThen(onToggleTheme)} aria-pressed={theme === 'dark'}>
        <span className="material-symbols-rounded" aria-hidden="true">{theme === 'dark' ? 'light_mode' : 'dark_mode'}</span>
        <span>{theme === 'dark' ? 'Use light mode' : 'Use dark mode'}</span>
      </button>
      {connected ? <>
        <small className="account-menu-status">{driveStatus === 'saving' ? 'Saving to Google Drive…' : driveStatus === 'error' ? 'Google Drive save needs attention.' : driveStatus === 'needs-plan-choice' ? 'Choose how to set up this Google Drive account.' : 'Your plan is stored in this Google Drive account.'}</small>
        <button type="button" onClick={() => closeMenuThen(onEditJson)}>Edit plan JSON</button>
        <button type="button" onClick={() => closeMenuThen(() => onConnectDrive({ prompt: 'select_account consent' }))}>Add or switch account</button>
        <button type="button" onClick={() => closeMenuThen(onDisconnectDrive)}>Log out</button>
      </> : <>
        <small id={!driveConfigured ? 'drive-configuration-status' : undefined} className="account-menu-status" role={driveError ? 'alert' : undefined}>{driveError || (!driveConfigured ? 'Google Drive sign-in is unavailable until this app is configured.' : 'Sign in to Google Drive to restore your plan. Your data appears after restore.')}</small>
        <button type="button" className="account-menu-primary" aria-describedby={!driveConfigured ? 'drive-configuration-status' : undefined} disabled={!driveConfigured || driveStatus === 'connecting'} onClick={() => closeMenuThen(() => onConnectDrive({ prompt: 'select_account consent' }))}>{driveStatus === 'connecting' ? 'Connecting…' : 'Sign in with Google'}</button>
      </>}
    </section>}
    <nav className="mobile-bottom-nav" aria-label="Primary navigation">
      <button type="button" className={homeActive ? 'is-active' : ''} onClick={() => closeMenuThen(onReturnToRoot)} aria-current={homeActive ? 'page' : undefined}>
        <span className="material-symbols-rounded" aria-hidden="true">home</span><span>Home</span>
      </button>
      <button type="button" className={view === 'sinking' ? 'is-active' : ''} onClick={() => closeMenuThen(onShowSinkingFunds)} aria-current={view === 'sinking' ? 'page' : undefined}>
        <span className="material-symbols-rounded" aria-hidden="true">savings</span><span>Sinking</span>
      </button>
      <button type="button" className={view === 'loans' ? 'is-active' : ''} onClick={() => closeMenuThen(onShowLoans)} aria-current={view === 'loans' ? 'page' : undefined}>
        <span className="material-symbols-rounded" aria-hidden="true">account_balance</span><span>Loans</span>
      </button>
      <button ref={mobileMoreButtonRef} type="button" className={moreOpen ? 'is-active' : ''} onClick={() => setMoreOpen(open => !open)} aria-expanded={moreOpen} aria-controls="mobile-more-menu">
        <span className="material-symbols-rounded" aria-hidden="true">more_horiz</span><span>More</span>
      </button>
    </nav>
    {moreOpen && <><button type="button" className="mobile-more-backdrop" aria-label="Close more options" onClick={closeMore} /><section ref={mobileMoreRef} id="mobile-more-menu" className="mobile-more-menu" role="dialog" aria-modal="true" aria-labelledby="mobile-more-title">
      <div className="mobile-more-heading"><strong id="mobile-more-title">More</strong><button type="button" onClick={closeMore} aria-label="Close more options"><span className="material-symbols-rounded" aria-hidden="true">close</span></button></div>
      <div className="mobile-more-actions">
        <button type="button" className={view === 'goals' ? 'is-active' : ''} onClick={() => closeMenuThen(onShowGoals)}><span className="material-symbols-rounded" aria-hidden="true">flag</span>Goals</button>
        <button type="button" className={view === 'investments' ? 'is-active' : ''} onClick={() => closeMenuThen(onShowInvestments)}><span className="material-symbols-rounded" aria-hidden="true">trending_up</span>Investments</button>
        <button type="button" className={view === 'ledger' ? 'is-active' : ''} onClick={() => closeMenuThen(onShowGeneralLedger)}><span className="material-symbols-rounded" aria-hidden="true">receipt_long</span>General ledgers</button>
        <button type="button" className={view === 'recurring' ? 'is-active' : ''} onClick={() => closeMenuThen(onShowRecurringPayments)}><span className="material-symbols-rounded" aria-hidden="true">event_repeat</span>Recurring payments</button>
        <button type="button" onClick={() => closeMenuThen(onToggleTheme)} aria-pressed={theme === 'dark'}><span className="material-symbols-rounded" aria-hidden="true">{theme === 'dark' ? 'light_mode' : 'dark_mode'}</span>{theme === 'dark' ? 'Use light mode' : 'Use dark mode'}</button>
      </div>
      <div className="mobile-more-account">
        <strong>{driveUser?.displayName || profile.name}</strong>
        <small>{driveUser?.emailAddress || (driveConfigured ? 'Connect Google Drive to restore and save your plan.' : 'Google Drive sign-in is not configured.')}</small>
        <small className="mobile-drive-status" role={driveStatus === 'error' || driveError ? 'alert' : undefined}>{driveError || (connected ? driveStatus === 'saving' ? 'Saving changes to Google Drive…' : driveStatus === 'error' ? 'Google Drive save needs attention.' : 'Your plan is stored in this Google Drive account.' : '')}</small>
        {connected
          ? <><button type="button" onClick={() => closeMenuThen(onEditJson)}>Edit plan JSON</button><button type="button" onClick={() => closeMenuThen(() => onConnectDrive({ prompt: 'select_account consent' }))}>Add or switch account</button><button type="button" onClick={() => closeMenuThen(onDisconnectDrive)}>Log out</button></>
          : <button type="button" disabled={!driveConfigured || driveStatus === 'connecting'} onClick={() => closeMenuThen(() => onConnectDrive({ prompt: 'select_account consent' }))}>{driveStatus === 'connecting' ? 'Connecting…' : 'Sign in with Google'}</button>}
      </div>
    </section></>}
    {!expandAll && <nav className="energy-breadcrumbs" aria-label="Flow location">
      <button onClick={onReturnToRoot}>Whole tree</button>
      {breadcrumbs.map(crumb => <span key={crumb.node.id}> / <button onClick={() => onNavigate(crumb.path)}>{crumb.node.name}</button></span>)}
    </nav>}
  </>
}
