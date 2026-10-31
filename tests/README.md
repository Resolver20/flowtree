# Flowtree tests

## Compact savings summary

- Edit a dated target and confirm its Savings plan shows only Expected saved, Remaining, and Required / month. The separate This month in plan row must be absent; allocation calculations must remain unchanged.
- Browser verified in the current dated-target editor on 2026-10-31: the three displayed amounts were ₹71, ₹929, and ₹71. The existing screen stayed open. This row removal did not repeat the viewport matrix.

## Ongoing regression rule

Every requested behavior change or reported bug must have matching coverage here before the work is considered complete:

- Add or update an automated test for logic that can be checked reliably. For a bug fix, the test should reproduce the original failure and pass with the fix.
- For visual or browser interactions, add a repeatable manual scenario with its expected result to the checklist below and verify it in the browser. Document any check that remains unverified.
- Preserve earlier regression cases so a new fix does not silently remove an older requirement.
- Report automated results separately from manual browser verification. A checklist entry is not an automated test.

## Running tests

Run all automated tests from the project root:

```sh
npm test
```

Run one file when checking a specific behavior:

```sh
node --test tests/domain/treeExpansion.test.js
```

## Automated coverage

The tests in `domain/` use Node's built-in test runner. Their names describe the behavior being checked.

| File | What it checks |
| --- | --- |
| [flowTree.test.js](domain/flowTree.test.js) | Editing and deleting nodes, annual targets, saved progress, hierarchy totals, migrations |
| [energyFlow.test.js](domain/energyFlow.test.js) | Allocation priority and preventing double counting |
| [loan.test.js](domain/loan.test.js) | Loan projections, extra payments, negative remaining balances, joint contributions |
| [loanPreview.test.js](domain/loanPreview.test.js) | Outside-click decision for empty list space, protected controls, and unsaved drafts |
| [monthlyHistory.test.js](domain/monthlyHistory.test.js) | Frozen monthly records, payment dates, changes applying to future months |
| [recurringPayments.test.js](domain/recurringPayments.test.js) | Monthly payment totals without counting children twice |
| [treeExpansion.test.js](domain/treeExpansion.test.js) | Reopening only immediate children and preserving other branches |
| [treeViewport.test.js](domain/treeViewport.test.js) | Readable card scale, first-node visibility, and compact Sinking funds spacing |
| [flowDataTransfer.test.js](domain/flowDataTransfer.test.js) | JSON validation, round trips, and supported financial fields |
| [restoreDriveSession.test.js](domain/restoreDriveSession.test.js) | Loading plans without waiting for Google profile details |
| [driveRestoreCandidates.test.js](domain/driveRestoreCandidates.test.js) | Valid backups, newest-first ordering, duplicate choices |
| [versionRecovery.test.js](domain/versionRecovery.test.js) | Five-version limit, download reuse, retries, bounded caching |
| [planVersionChanges.test.js](domain/planVersionChanges.test.js) | Descriptions of additions, modifications, renames, and deletions |
| [saveShortcut.test.js](domain/saveShortcut.test.js) | Recognizing Command+S and Control+S |

## Manual browser regression checklist

These checks are manual; `npm test` does not run them. Use the local offline copy for financial edits. Record the viewport and outcome when testing a release.

- Home: the first element is reachable; cards stay readable; connectors meet their cards while opening and closing branches.
- Monthly summary: Deductions is the green amount on the left, Remaining is the purple amount on the right. Use plans with positive, zero, and negative remaining amounts: preserve each signed value, keep the Remaining label and purple color, and do not show Over-planned or percentage clutter. The tree's monthly-plan label must also say remaining. Check both light and dark themes and the mobile summary when shown. These values remain planning projections, not confirmed bank deductions.
- Home's monthly summary must not display a next-funding message such as “Next: Long-Term Growth needs…”, including when deductions exceed income. It shows the Deductions and Remaining amounts without a funding recommendation.
- Switch Home → Sinking funds → Home repeatedly: Sinking funds has no empty space reserved for Home's profile or unopened columns; cards keep their readable size and do not slide from Home's previous positions. Open a Sinking funds branch and confirm its connectors stay aligned. Repeat on phone, tablet, laptop, and wide desktop.
- Sinking funds shows its Expected saved summary at the top. Switching back to Home restores Monthly outlook with green Deductions and purple Remaining.
- Responsive views: check phone portrait, phone landscape, tablet, laptop, and wide desktop for clipping and unintended page scrolling.
- Loans: outside clicks return read-only details to the preview; inside clicks keep the card open; outside clicks preserve edit drafts.
- Loans outside-click regression: open a configured Home/House Loan, then click the empty space directly below its button in the left-hand list (or a gap between loan buttons). Expect **Your loans at a glance** and no selected loan. Reopen the loan and click a metric inside its details: it must stay open. Open the repayment schedule, click outside, and reopen: the schedule must be collapsed. Edit a loan name, click outside, and confirm the unsaved name remains. Repeat on phone portrait, tablet, laptop, and wide desktop; use **Back to preview** with keyboard activation too.
- Saving: Command+S and Control+S save once; open dialog drafts are protected; the confirmation disappears; manual save status updates correctly.
- Refresh: the selected section, monthly selection, and scroll position return after reloading.
- Version recovery: the dialog opens immediately; Keep current version preserves edits; closing during loading does not reopen it; selecting a snapshot alone changes nothing; loading a version does not upload it.
- Offline testing: Save persists only the browser test copy; refresh restores it; Drive stays disconnected.

The private offline JSON and `offline.local.html` are ignored by Git and are not test fixtures committed to this folder. Automated tests use their own synthetic data.

### Loan outside-click check — 2026-10-31

- Reproduced locally: clicking below House Loan in the stretched left-hand list left its details open. After the fix, that same click showed **Your loans at a glance**.
- Browser verified in the offline copy: outside clicks returned to preview at 390×844, 568×320, 768×1024, 1366×768, and 1920×1080. Inside metric clicks, preservation of an unsaved edited name, schedule collapse on reopening, and Enter activation of **Back to preview** passed at the default desktop size.
- Automated checks: 60 tests passed, lint passed, production build passed. The selector decision tests use synthetic ancestors; actual browser interaction is covered by the manual checks above.
- The full Home expansion, new-node, and long-label visual matrix was not rerun for this Loans event-handler change. No deployment was performed.


### Active/Inactive and start dates — 2026-10-31

- Automated: `nodeStatus.test.js` covers the two choices, legacy JSON status mapping, recursive immutable normalization, zero allocation for inactive branches, reactivation, and date/status JSON round trips. It also checks that goal tenure starts from the selected date and clamps leap days.
- Manual repeatable scenario: edit an inactive Life goal, set its start and target dates, and save. Reopen it: both dates and Inactive remain, with ₹0 in Home. Toggle Active to see a contribution; return to Inactive to see ₹0. A target before the start date must block saving. Changing the years field derives the target from the selected start date.
- Manual card/loan scenario: edit a monthly card or loan, confirm Status offers only Active and Inactive and Start date is editable. Inactive must reserve ₹0 while retaining its entered amount and loan calculation. An inactive investment draft must also preview ₹0 in Home.
- Browser verified in an isolated offline tab: inactive goal date save/reopen, invalid date rejection, tenure date calculation, and switching statuses. Setting a ₹1,000 monthly card inactive changed Deductions from ₹34,083 to ₹33,083. Inactive loan draft and saved detail showed ₹0 in Home; investment draft exposed the new status choices. Keyboard Enter saved the monthly card.
- Goal date fields were enabled and the form had no horizontal overflow at 390×844, 768×1024, 1366×768, and 1920×1080. The broader tree expansion, new-node, long-label, and phone-landscape visual matrix was not rerun for this change. Test-tab edits were not saved to browser storage or Drive; the user's original tab and prior unsaved data were preserved.

### Compact target-date shortcut — 2026-10-31

- Repeatable manual scenario: open a yearly destination's editor. The target-date input, calendar picker, and compact **+1 year** shortcut must share one row, including at 320px width. The shortcut retains the accessible name and tooltip **One year from today**. Activate it with Enter: both the typed date and calendar date must change to one year from today. Typing another valid target date must still work.
- Browser verified: Enter set the date to 31/10/2027, then the existing unsaved draft date was restored. Measured the shortcut at about 56×32px, with no date-row horizontal overflow at 320×740, 390×844, 568×320, 768×1024, 1366×768, and 1920×1080. The open editor and user draft were preserved. This is a presentation change; no date-calculation logic changed. Full tree visual checks were not repeated.

### Monthly requirement for inactive goals — 2026-10-31

- Automated: `requiredMonthlyAmount.test.js` separates the target's requirement from active allocation. It covers the inactive ₹20,00,000 goal over 24 months, saved progress, changed targets and deadlines, a completed target, and monthly amounts. Inactive allocation remains zero; reactivation allocates the calculated requirement.
- Repeatable manual check: edit an inactive yearly goal with ₹20,00,000 target, ₹0 saved, start 01/11/2026, target 31/10/2028 (as of 31/10/2026). Expect **₹83,333 needed monthly** while **Monthly branch total** stays ₹0. Enter ₹4,00,000 saved and expect ₹66,667 needed monthly. Restore the original draft without saving. The annual target editor and dedicated Life goals screens also use the status-independent requirement; Home contribution remains governed by status.
- Browser verified in the existing editor: both amounts above and the zero branch total. Requirement text had no horizontal overflow at 390×844, 768×1024, 1366×768, and 1920×1080. Existing date/status/saved drafts were preserved, and the screen was left open. Dedicated Life goals and the full tree visual matrix were not rerun for this change.

### Repeated target-year shortcut — 2026-10-31

- This replaces the earlier one-year-from-today shortcut behavior. **+1 year** now advances the selected target date by one year on each activation; its accessible name and tooltip are **Move target date forward one year**.
- Automated: `goalDates.test.js` covers consecutive increments, preserving day/month, dates unrelated to today, and leap-day clamping to 28 February.
- Repeatable manual scenario: open a yearly destination with target 31/10/2028. Click twice: expect 31/10/2029, then 31/10/2030. Activate with Enter: expect 31/10/2031. The text input and calendar must stay synchronized, and the monthly requirement must recalculate. Verify in a temporary offline tab without saving; preserve the user's existing editor draft.
- Browser verified all three increments at the default desktop size in an isolated tab. The temporary tab was closed, and the original screen stayed open. No layout changed; the viewport/tree matrix was not repeated.

### Goals have targets and dates, without frequency — 2026-10-31

- Automated: `goalDestination.test.js` covers existing and nested goal destinations, new children under Life goals, and exclusion of grouping roots and regular expenses. Goal forms use the dated-target calculation; existing saved data is only changed when the user saves.
- Manual scenario: edit a Life goal from its Home card and from Life goals. Neither form should show Monthly/Yearly or Planning frequency. Both must show a target amount, saved amount, start date, target date, and calculated monthly requirement. Save and reopen: the target, dates, status, and calculation must persist. The Home management card must say **Goal target**, with no `/year` suffix.
- Browser verified both editors and saving from both entry points in a temporary offline tab. The inactive ₹20,00,000 EV Car goal retained ₹83,333 needed monthly and inactive status. The dedicated form had no horizontal overflow at 390×844, 768×1024, 1366×768, and 1920×1080. Original unsaved data was preserved and its editor left visible. The full tree expansion matrix was not repeated.


### Inactive goal card estimates — 2026-10-31

- Automated: `goalCardPreview.test.js` covers inactive goals showing their estimated monthly requirement without changing allocation, estimates below a paused parent, unchanged non-goal allocations, legacy inactive status markers, and non-mutation.
- Repeatable manual scenario: keep a goal inactive, then inspect its Home card and Life goals list/overview. Each goal card must show the calculated monthly requirement with a small pause icon. The icon's accessible name and tooltip must explain that the item is inactive and excluded from monthly allocation. Deductions, Remaining, and combined active goal contributions must exclude it. Selecting the goal with Enter must still work.
- Browser verified the user's inactive EV Car at ₹50,000/month, pause marker present, with Home Deductions ₹34,083 and Remaining ₹28,917 unchanged. Home card content had no horizontal overflow at 390×844, 568×320, 768×1024, 1366×768, and 1920×1080. Life goals list buttons fit at phone portrait, tablet, laptop, and wide desktop sizes, with a 13px inline pause marker. Enter opened the goal details, which separately showed the ₹50,000 requirement and inactive status.
- Existing data was not saved or changed. Browser size was restored and the website left visible. Long-label/new-node creation and branch expansion/connector geometry were not rechecked for this presentation-only change.

### Right-aligned inactive marker — 2026-10-31

- Manual scenario: inspect an inactive goal on Home, mobile Home, and the Life goals list/overview. Its pause icon must sit at the card's right side, separate from the monthly amount, and remain labelled **Inactive — excluded from monthly allocation** for assistive technology.
- Browser verified the icon at 19px (previously 13px), inset 13px from Home card edges, at 390×844, 568×320, 768×1024, 1366×768, and 1920×1080. No card horizontal overflow occurred. The default-desktop Life goals list marker was right-aligned with an 11px inset; the overview row placed it beside the navigation arrow. Monthly estimates remained visible. No financial logic changed; wider tree geometry and new-node/long-label scenarios were not rerun.


### Passive inactive status symbol — 2026-10-31

- The inactive marker uses plain pause bars rather than a circle, with muted color and a default cursor. It has no border, background, independent click action, or tab stop; the accessible description remains unchanged.
- Manual scenario: inspect the inactive goal on Home and in Life goals. Confirm the plain marker remains at the right, reads as status, and does not acquire button styling. Browser verified the Life goals marker as `role=img`, `tabIndex=-1`, 0px border, transparent background, and plain `pause` glyph at the default desktop size. Earlier responsive geometry checks remain documented above; they were not rerun for this glyph-only change.


### Plain Paused text — 2026-10-31

- Supersedes the icon treatments above: inactive cards use muted **Paused** text on the right, with no symbol or button styling. The marker is ordinary text, not an image or interactive element.
- Manual scenario: inspect an inactive goal card. Its monthly estimate must remain visible beside the right-aligned Paused label; status must still exclude it from allocation. Browser verified Home displays ₹50,000/month and Paused, with a 10px label, default cursor, and no tab stop. Lint and build passed. The responsive matrix was not repeated for the text replacement.


### Fresh and existing goal schedules — 2026-10-31

- Automated: `goalSavingsPlan.test.js` covers fresh goals including the current month, existing goals' planned progress before this month, remaining balance, recorded savings ahead of plan, current-month deadlines, future starts, completed targets, and JSON start-date persistence. The existing finite-goal regression now counts both start and target months, retaining its coverage of higher recorded savings.
- Manual fresh scenario (31/10/2026): add a ₹1,20,000 goal, choose **Start fresh from today**, target 31/03/2027, and Active. Expect ₹0 expected saved, ₹1,20,000 still to save, ₹20,000 required and included this month, across six contributions. Save and reopen from Home: the start date must remain 31/10/2026. The offline test's Deductions rose from ₹34,083 to ₹54,083 and Remaining fell from ₹28,917 to ₹8,917.
- Manual existing scenario: choose **Already started**, start in January 2026, target December 2026, and ₹1,20,000 target. Expect ₹90,000 planned before October, ₹30,000 still to save, and ₹10,000 required for each of the three remaining months. Save and reopen in both editors and the Home management card. Switching to fresh resets the historical estimate to ₹0 and recalculates from today. Inactive keeps the required amount visible while Included in this month's plan is ₹0.
- All scenarios above passed in a temporary offline tab without saving to browser storage or Drive. The shared summary had no horizontal overflow at 390×844, 568×320, 768×1024, 1366×768, and 1920×1080. Keyboard Enter saved the Home editor. Full tree connector/expansion and long-label/new-node geometry checks were not repeated. The original plan and user's current open screen were preserved.


### Shared compact card setup — 2026-10-31

- **Card setup: Fresh / Already started** replaces the goal-only setup control. Fresh uses today; Already started exposes a start date. The control appears in destination/category, monthly bill, dated target, loan, investment, income, and bulk annual-target editors. Fresh explanatory text was removed; dated savings summaries use short labels.
- Automated: `cardStart.test.js` covers local fresh dates, existing-date recognition, non-goal dated-target progress, and preserving fixed monthly amounts and lender calculations.
- Repeatable manual scenario: open each editor, switch Already started to reveal Start date, enter a date, save, and reopen. Fresh should hide the date field and use today. For a dated target, the summary must recalculate; monthly bills keep their fixed amounts and loan projections keep the lender inputs.
- Browser verified the two choices and date field on Current bill, Car insurance, Home's House Loan editor, Salary, the investment editor, and the dedicated loan editor. A loan start date of 02/01/2026 survived save/reopen. Loan editor had no horizontal overflow at 390×844, 768×1024, 1366×768, and 1920×1080. Bulk annual editor was checked in source, not opened in the browser. Prior goal checks remain above. Temporary test changes were not saved to browser storage or Drive; the user's original screen stayed open. Full tree geometry and long-label/new-node scenarios were not rerun.


### Remove setup from monthly editors — 2026-10-31

- Supersedes the all-card setup scope above. Fresh / Already started is limited to dated/yearly targets. Fixed monthly destinations, both loan editors, investments, and income omit it. Income retains its original Starts on date; existing destination/loan/investment dates are preserved on save.
- Repeatable manual scenario: edit Current bill with Monthly frequency and confirm Card setup is absent. Change to Yearly: the setup option appears. Change back to Monthly: it disappears. Verify no Card setup option in loans, investment, and income editors. Dated goals and annual targets retain their setup and calculations.
- Browser verified Monthly → Yearly → Monthly with setup counts 0 → 1 → 0, and absence in the Home loan editor, income editor, and investment editor. The dedicated loan removal was inspected in source. No test edits were saved to browser storage or Drive. Lint, build, and 80 tests passed; full viewport/geometry checks were not repeated for removing controls. The original website remains visible.


### Sinking funds expected-saved summary — 2026-10-31

- Automated: the nested sinking-savings case in `flowTree.test.js` checks summing yearly saved-progress records exactly once, ignoring monthly records and handling an empty tree. The summary reuses `totalExpectedAnnualSavings` rather than introducing another calculation.
- Manual scenario: switch Home → Sinking funds. Expect Sinking funds outlook with one Expected saved total at the top, outside the tree's scrolling world. Open and close a nested branch with Enter: the total must remain unchanged. Switch Home: Monthly outlook must return and the sinking summary must be absent. An empty sinking tree should show ₹0.
- Browser verified the populated summary (₹3,108 in the current local plan), stable total on keyboard branch expansion/collapse, and correct view switching. Measured no summary/tree overlap or horizontal page/summary overflow at 320×740, 390×844, 568×320, 768×1024, 1366×768, and 1920×1080. The website was left visible in Sinking funds with the viewport restored. The empty UI, dark theme, and broad new-node/long-label connector matrix were not checked in this change.

### Sinking funds child parity — 2026-10-31

- Automated: `sinkingFunds.test.js` checks that filtering preserves Home's relative sibling order, keeps every descendant under a yearly target (including monthly children), retains record values and nested ancestors, excludes unrelated monthly branches, and does not mutate the input.
- Repeatable scenario: on Home add a Monthly child of ₹100 under Car insurance. Switch to Sinking funds and expand Risk Protection → Car insurance using Enter. Expect the child at ₹100/month in both views and the same ₹692 parent branch total. Close and reopen the branch; the child must remain. Compare Cash Flow's retained sibling order against Home: Subscriptions precedes Mobile recharge when Home orders them that way.
- Browser verified the new-child scenario and keyboard expansion in a temporary offline tab, plus the Cash Flow order in the user's existing plan. Phone portrait (390×844) showed the same nested child. Desktop's scrollable tree retained the branch; wider connector/viewport geometry was not rerun for this filter change. Temporary data was not saved; the original tab and its unsaved plan were preserved. All 84 automated tests, lint, and build passed.

### Sinking funds root — 2026-10-31

- Sinking funds starts directly at a single Sinking funds root on desktop and mobile, without income cards, profile, Monthly plan, or remaining-month amount. Its categories, children and expected-saved summary remain available. Home retains its original income and Monthly plan presentation.
- Automated: `treeViewport.test.js` covers the compact root-only layout, no income-source points, root-to-category connectors, stable root position during expansion, and Home → Sinking funds → Home layout isolation. All 84 tests, lint and build passed.
- Manual scenario: switch Home → Sinking funds; confirm the single root and absence of Salary/Monthly plan. Expand/collapse Risk Protection with Enter and confirm child cards remain. Return Home and confirm Salary/Monthly plan return. Browser verified switching and keyboard expansion, plus root text, zero income nodes and no horizontal page overflow at 390×844, 568×320, 768×1024, 1366×768 and 1920×1080. The full connector, long-label and new-node geometry matrix was not repeated. Left the original plan open in Sinking funds without saving its unsaved changes.

### Canvas zoom and pin — 2026-10-31

- Home and Sinking funds have local − / percentage reset / + controls (40–160%) and a toggle to lock the canvas position and zoom. Pinning leaves card actions available, blocks scrolling/pinch/automatic navigation scrolling, and disables zoom controls. Unlocking restores movement without resetting the camera. This is view-only state; no financial data is changed or saved.
- Automated: `canvasGestures.test.js` covers zoom bounds, trackpad Ctrl+wheel versus native scrolling, two-touch distance/midpoint, cancellation, Safari gesture support, locked inputs, unlocking, and listener cleanup. These are event-handler tests, not physical-device gesture checks.
- Manual scenario: zoom out with Enter, zoom in, reset to 100%, and reach both limits. Scroll to a nonzero position, pin, attempt scrolling and zooming, and confirm position/percentage stay fixed. Unlock and scroll again. In Sinking funds, open and close Risk Protection and confirm all children remain available. With an actual touch device or trackpad, pinch in/out over the canvas and verify the content stays around the gesture center; outside the canvas browser zoom should remain native.
- Browser verified keyboard activation, reset, both limits (all 20 Home cards retained), disabled zoom controls when pinned, scroll blocking at top 927px, and scrolling restored after unlocking. Checked toolbar visibility, no summary overlap, and no horizontal page overflow on Home's expanded tree and Sinking funds at 390×844, 568×320, 768×1024, 1366×768, and 1920×1080. A nested Sinking branch was opened with Enter and shown at 80% on phone. Physical pinch/trackpad gestures, long-label/new-node cases, and exhaustive connector geometry were not manually verified. No test data was saved; the original website stayed open.

### Visible unsaved status after undo — 2026-10-31

- The shared header now spells out Unsaved changes on mobile rather than replacing it with an unlabeled visual dot. The existing saved-content comparison still governs the status across all sections: undo/redo only shows unsaved when the plan differs from the last successful save.
- Repeatable scenario: edit Current bill from ₹1,000 to ₹1,100, save the plan, then undo. Expect Unsaved changes and ₹1,000. Visit Home, Sinking funds, Loans, Life goals, Recurring payments, Investments and General ledger; the indicator must remain. Redo to the saved ₹1,100 version: the indicator clears. Undo again: it returns. At 320px width, the full text may wrap onto two lines but must fit beside undo/redo/download/save without toolbar overflow.
- Browser verified that scenario in a temporary offline harness whose save callback only resolves in memory, with no browser-storage or Drive writes. All seven sections retained the status; redo cleared it and undo restored it. At 320×740 the text was 10px, within viewport bounds and the header had no horizontal overflow. This CSS-only change does not alter undo/save logic; full tree geometry was not repeated. The user's original screen stayed open.

### General ledger overview — 2026-10-31

- General ledger now starts with an overview when ledgers exist. It shows combined expense budgets, recorded expenses, signed budget remainder (displayed as Over budget by when negative), and links to each ledger. The sidebar Overview action, Back to overview button, and blank space outside details return to it. Outside clicks preserve open editor drafts. Empty data retains the existing create-first-ledger state.
- Automated: `generalLedger.test.js` covers combined budgets/expenses without double counting, decimals, empty/legacy records, large values, overspending, input immutability, and outside-click exclusions for editors and controls. Calculation helpers are shared by overview and individual ledger details. All 91 tests, lint and build passed.
- Repeatable browser scenario: create Home GL with ₹25,000 budget and ₹1,500 expenses, then another ledger with ₹1,00,00,000 budget and ₹1,00,05,000 expenses. Expect overview totals ₹1,00,25,000 budget, ₹1,00,06,500 expenses, ₹18,500 remaining, and two expense records. The second ledger must still display its own ₹5,000 overspending. Open Home GL with Enter, return with Back to overview, and reopen then click the page heading to return. Edit a GL name and click the heading: the editor and draft must remain until Cancel or Save.
- Browser verified this scenario in a temporary offline tab, including a long ledger name. At 390×844, 568×320, 768×1024, 1366×768 and 1920×1080 the overview had no horizontal overflow and stayed within the usable page width. The tablet layout preserves the sidebar's 224px space and uses a horizontal ledger selector. Empty state was also inspected. Test data was not saved to storage or Drive; the original website remained open. Dark theme, deletion, and unrelated tree geometry were not manually rerun.

### Canvas-relative zoom-out boundary — 2026-10-31

- Supersedes the fixed 40% zoom minimum above. The centered tree must occupy at least 20% of each usable canvas dimension, limiting empty margins to 40% per side. The first dimension reaching that margin stops zoom-out; different tree/canvas aspect ratios need not produce equal horizontal and vertical margins. Zoom-in remains capped at 160%. Short canvases may still require scrolling to see a tall tree. Limits recalculate for viewport changes and opening/closing branches; a pinned camera stays fixed until unlocked.
- Automated: `canvasGestures.test.js` now covers both dimension constraints, different aspect ratios, responsive sizes, expanded branches, rounding up at the minimum, invalid/empty measurements, and the 160% maximum. All 93 tests, lint and build passed.
- Repeatable scenario: on Home and Sinking funds, repeatedly zoom out until disabled. Confirm centering and no more than 40% empty space on each edge of the usable canvas (excluding its padding/control reserve). Attempt another pinch or minus action; the tree must not shrink further. Open a branch: the minimum may decrease. Close it again: zoom must rise to the new minimum if necessary. Zoom in until disabled at 160%, reset, then pin and confirm gesture/scroll locking still applies.
- Browser verified minimum/disabled controls and dimension margins on both views at 390×844, 568×320, 768×1024, 1366×768 and 1920×1080, with no horizontal page overflow. At laptop size, Sinking funds stopped at 41%, allowed 29% with Risk Protection expanded, and returned to 41% on collapse. Zoom-in stopped at 160%. On Home at laptop size, horizontal half-empty space was 39.98% at the minimum. Short-landscape trees remain scrollable. Physical pinch, dark theme, and new-node/long-label scenarios were not manually rerun; event-handler coverage remains automated.

### Pinned views in plan JSON — 2026-10-31

- Supersedes the view-only pin state above. Optional `canvasPins` stores separate Home/Sinking camera snapshots (zoom, scroll offsets, path and collapsed paths) and `lastView`. Pin/unpin and branch changes while pinned participate in the usual save/unsaved/undo flow. JSON editing, raw export, backup export, imports, offline saves and Drive plan serialization retain the field. Restoring a saved plan selects the most recently pinned view ahead of session navigation. Smaller viewports clamp scroll offsets to reachable content without changing the saved JSON.
- Automated: `canvasPins.test.js` covers independent pins, last-view selection, unpinning, immutable updates, legacy defaults and malformed coordinates/paths. `flowDataTransfer.test.js` covers raw/backup JSON round trips, legacy compatibility and invalid input rejection. Shared zoom constants keep import validation and controls consistent.
- Repeatable scenario: collapse Cash Flow on Home, set zoom to 80%, scroll, pin and Save. In Sinking funds open Risk Protection, set zoom to 110%, scroll, pin and Save. Navigate to General ledger, close the tab and reopen the saved plan. It must start on Sinking funds, locked at 110%, with Risk Protection open and the same reachable scroll offsets. Switch Home: expect its independent 80% pin and collapsed Cash Flow. Unpin: Unsaved changes appears. Undo: the saved pin returns and the unsaved label clears.
- Browser verified this using a temporary offline harness with an isolated test-only storage key, which was cleared afterward. Sinking restored at 110% / top 198px and Home at 80% / top 271px; branch state and undo/unsaved behavior matched. Restored pins remained locked, clean, and within valid scroll bounds at 390×844, 568×320, 768×1024, 1366×768 and 1920×1080 without horizontal page overflow. No production storage/Drive writes or real Google login were performed. The original tab remains open. New-node/long-label geometry and physical pinch were not rerun.

### Mobile footer account access — 2026-10-31

- Mobile Account is the fifth footer item beside Home, Sinking, Loans and More. It replaces the top-right mobile avatar and opens the shared account menu above the footer. The save toolbar no longer reserves space for the removed top avatar. Desktop keeps the sidebar profile. More and Account close each other; opening Account focuses its first action and Escape closes it and returns focus to the visible profile trigger.
- Repeatable scenario: on phone, activate Account with Enter. Verify profile identity and sign-in when disconnected, and save/recovery/JSON/account-switch/log-out actions when connected. Escape returns focus to Account. Open More then Account and vice versa: only one menu may remain. On short landscape, scroll the menu to reach Log out without it covering the footer. Keep readable unsaved status and usable targets at 320px.
- Browser verified footer placement and keyboard opening in the real offline plan. An isolated TreeHeader fixture with mocked connected/disconnected callbacks verified sign-in/log-out button states, focus return, and mutual exclusion with More without real authentication or account writes. At 320×740, 390×844 and 568×320 the profile target was at least 62×53px, the menu stayed within the screen and above the footer, and there was no page/menu horizontal overflow. At 768×1024, 1366×768 and 1920×1080 the footer profile was hidden and the existing sidebar profile/menu remained usable. A long profile name was included. No financial logic changed; full tree geometry and real Google login/logout were not rerun. The temporary fixture was removed and the original website stayed open.

### Save button right spacing — 2026-10-31

- The shared save toolbar now uses a 10px right inset on desktop as well as mobile, reducing the previous 24px desktop gap.
- Repeatable scenario: open any section with Save available and compare the button's right edge with the viewport. Expect a 10px gutter, with the toolbar controls fitting at each breakpoint. Browser measured exactly 10px and no toolbar horizontal overflow at 320×740, 390×844, 568×320, 768×1024, 1366×768 and 1920×1080. This is a shared CSS padding change; full tree interactions and authentication were not rerun. The viewport was restored and the website left open.

### Pin only the zoom level — 2026-10-31

- Supersedes the scroll-lock behavior above. Pin zoom level disables zoom buttons and pinch zoom while leaving vertical/horizontal scrolling, native one-finger panning and branch navigation available. Saved starting coordinates restore once when loading a pin; no scroll listener forces the user back to them. Branch-only pin updates do not restore the old camera position. Existing saved pins remain compatible.
- Automated: the gesture regression now explicitly checks that ordinary vertical/horizontal wheel events and single-touch start/move are not prevented while pinned; Ctrl+wheel, two-touch pinch and Safari zoom gestures still cannot change zoom. Other persistence and zoom-boundary cases remain covered.
- Repeatable scenario: restore a 130% pin, scroll vertically and horizontally, and attempt to pinch/zoom. Scroll offsets must change while zoom remains 130%. Open/close a branch, then continue scrolling. Switch to Sinking funds and repeat. Reopen a saved pin under React StrictMode: saved starting coordinates must still restore before free panning.
- Browser verified the restored StrictMode Home pin at left 50px / top 120px. Desktop wheel scrolling moved it to left 585.5px / top 754px while zoom stayed 130%; a Ctrl+wheel attempt also retained 130%. On 390×844, Home scrolled from top 0 to 844px and Sinking funds from 120 to 349px, both still pinned at 130%. A branch was closed with the pin active. The temporary offline fixture was removed, no plan data was saved, and the original website stayed open. Physical touch gestures and the complete viewport/connector matrix were not rerun for this correction.

### Fixed responsive mobile cards — 2026-10-31

- Supersedes mobile zoom/pin behavior above. At browser widths ≤760px, Home and Sinking funds render at 100%, omit canvas controls, install no custom zoom gesture handlers, and use width-fitting cards with normal vertical scrolling. Browser accessibility zoom remains native. Saved desktop pins are ignored on mobile without being removed or changed. At ≥761px desktop zoom, controls and saved pins remain available.
- Automated: `canvasGestures.test.js` verifies the disabled/mobile mode installs no event handlers and cleans up safely, retaining all desktop gesture and pin regressions.
- Repeatable scenario: load a plan with a 160% Home pin and 60% Sinking pin. On phones both views must render at 100% with no canvas controls or horizontal canvas scrolling. Open/close a branch with Enter and scroll vertically. Resize to 761px or wider: controls and each view's original saved zoom return, without Unsaved changes. Include long labels and large Indian-formatted amounts.
- Browser verified both views at 320×740, 360×800, 390×844, 430×932, 568×320 and 760×900 in a temporary StrictMode fixture containing a long destination name and a ₹1,23,45,678 direct amount. Every mobile check showed 100%, zero controls and no canvas/page horizontal overflow. Enter collapsed/reopened Cash Flow, and vertical scrolling reached top 844px. Desktop Sinking returned to 60%; Home returned to 160% with controls and no unsaved changes at 761×900, 768×1024, 1366×768 and 1920×1080. No fixture data was saved. Physical phone hardware, all possible devices, and exhaustive connector/new-node geometry were not checked. The original website remains open.

### Automated browser regression: Monthly outlook containment

Start `npm run dev`, then open `http://127.0.0.1:5173/tests/browser/monthly-outlook.html`. The page automatically runs 28 real-browser geometry checks against the production `TreeStatus` component and CSS; expect **28/28 passed; 0 failed**. It checks the 760px mobile boundary, 761/768/900/918/984/1024/1366/1920px widths, normal and large signed amounts, and dark mode. Assertions cover panel/card/text containment and separation of Deductions and Remaining. A missing result fails after 15 seconds. These browser assertions are separate from `npm test`, which runs the Node domain suite.

On 2026-10-31, this regression reproduced 11 failing cases before the fix and passed all 28 afterward. The summary grid now lets its columns shrink within the panel, and large amounts wrap without being clipped. The live 918px preview's Remaining card right edge changed from 911px (outside the panel's 890px edge) to 877px (inside its padding). The open tab's stylesheet was updated without reloading or saving its unsaved plan. The test page checks the summary component; unrelated tree geometry was not rerun.

### Monthly income percentages on cards — 2026-10-31

- Destination cards on Home and Sinking funds, desktop and mobile, show a small unboxed percentage in their top-right corner. The tooltip and accessible description identify it as a share of total monthly income before the safety buffer or deductions, separate from annual/goal savings progress. Parent shares include descendants; parent and child shares describe the same money and must not be added together. Inactive branches show 0%; positive shares below 0.1% use `<0.1%`.
- Automated: `monthlyPlanShare.test.js` covers the whole-plan denominator, nested parent/child totals, annual monthly equivalents, underfunded plans, inactive ancestors, zero totals, tiny shares, missing paths, and filtered sinking branches retaining the same denominator.
- Repeatable scenario: with ₹63,000 monthly income and ₹34,083 planned, a ₹20,000 loan branch should show 31.7%, a ₹1,000 bill 1.6%, and an inactive goal 0%. Expand/collapse branches and switch Home/Sinking funds: the global denominator must stay unchanged. Annual cards must retain their separate saved-progress percentage. Inspect labels and keyboard descriptions, and ensure the share stays inside the card without covering Paused or expansion controls.
- Earlier layout-only browser verification (before the income-denominator correction) checked 20 Home share labels at 320×740, 390×844, 568×320, 768×1024, 1366×768 and 1920×1080: none extended beyond their cards and there was no page horizontal overflow. The loan branch retained 58.7% across sizes. Sinking funds Risk Protection showed 3.2%, with insurance children 1.7%/0.7%/0.7%; keyboard expansion preserved the denominator. The original unsaved tab was preserved rather than reloaded; validation used a temporary fresh preview. Large custom card amounts and deep newly added branches were not manually repeated for this label addition.

### First Google sign-in on mobile — 2026-10-31

- Automated Node coverage: `googleDriveSignIn.test.js` checks shared SDK preparation without authorization, a synchronous popup request on the first ready click, refusing delayed popup requests, script failure/initialization retries, and readable blocked/closed-popup messages. These are synthetic OAuth tests, not a real Google login.
- Browser fixture: open `/tests/browser/google-sign-in.html` with the Vite server running. It uses the production Drive hook, mobile/desktop Account UI, and setup dialog, but replaces Google SDK and Drive responses. It never sends a Google request or uploads a plan. Requires a configured public `VITE_GOOGLE_CLIENT_ID`.
- At 390×844, open footer Account before pressing **Finish loading Google**. Expect disabled **Preparing Google sign-in…**, no error, zero authorization requests. Finish loading, reopen Account, then activate **Sign in with Google**. Expect the setup dialog with `requests:1`, `inUserGesture:true`, `writes:0`; no false Drive failure when the account has no plan. Dismiss with **Not now**.
- Repeat with `?mode=blocked` and `?mode=closed`. Expect a visible Account dialog containing the specific popup error, and an enabled retry action. Check keyboard Enter activation. Repeat at desktop width using the sidebar Account control.
- With `?mode=load-error`, finish loading once to simulate a blocked SDK. Expect a readable loading error. Activate Sign in to prepare again, finish loading again, then try sign-in; no delayed popup should open without another user gesture.
- Live check still required: on a phone browser, reload the deployed app and sign in once with Google; verify consent, account restoration/setup, and explicit Save. Real OAuth and the user's original reported message were not reproduced in the local synthetic tests.
- Verified locally in the synthetic browser fixture: mobile 390×844 loading/first login/setup with one active-gesture authorization and zero writes; blocked-popup dialog and keyboard retry; SDK network failure followed by successful reload/retry. Desktop 1366×768 closed-popup dialog and keyboard activation also verified. The original offline tab stayed open without reload or data replacement.

- Income denominator correction: every desktop/mobile card on Home and Sinking funds now uses the same total monthly income (sum of income sources), before buffer/deductions. The loan example is ₹20,000 / ₹63,000 = 31.7%. Changing other card targets or filtering the view must not change its percentage; changing total income must. Zero income shows 0%; over-budget targets may exceed 100%. Node regression tests cover these calculations.
- Correction verified in a fresh offline preview: desktop Home House Loan and Debt Commitments both show 31.7% for ₹20,000 out of ₹63,000 income; the ₹1,000 bill shows 1.6%. At 390×844, mobile Home retains those labels, and Sinking funds uses the same income base (Risk Protection 1.7%). Tooltip/accessibility text says “of monthly income”. Original tab was kept open without reload or data replacement.

### Mobile card editor and info actions — 2026-10-31

- Phone form fields use 16px text. Opening a card editor focuses Close rather than a text input, so the user chooses when to open the keyboard. Desktop retains initial input focus. Browser pinch zoom remains available.
- Card dialogs follow `visualViewport` resize/scroll events, with a scrollable form and reachable Save/Cancel actions above the keyboard. Info actions use a single full-width column on phones in DOM/keyboard order: Edit details, Add child, View overview when available, then Delete. Income/profile info follows the same primary-action-first order.
- Automated Node coverage: `dialogViewport.test.js` verifies keyboard height, viewport panning, keyboard dismissal, desktop/fallback behavior, and listener/frame cleanup.
- Automated browser assertions: run Vite and open `/tests/browser/mobile-card-editor.html?mode=edit&keyboard=1` and `?mode=manage`. Inspect `body[data-result]` and `#test-result`. The fixture renders the real PlanDialog with an annual card; it simulates a keyboard shrinking only the visual viewport. It checks initial focus, 16px control text, no horizontal overflow, action order/stacking, dialog bounds, focused-field visibility and reachable Save.
- Verified both fixture modes at 320×740, 390×844, 568×320, 768×1024, 1366×768 and 1920×1080. Also inspected the actual offline House Loan info/editor at 390×844: Close receives focus, all eight controls are 16px, and the dialog has no horizontal overflow. Original user tab/data remained untouched.
- Physical-device check still required: on iPhone Safari and Android Chrome, open an info panel, choose Edit details, tap fields near the beginning and end, switch numeric/date inputs, dismiss/reopen the keyboard, rotate the phone, and Save/Cancel. Expect no automatic input zoom, no keyboard on initial open, focused fields and actions reachable by scrolling, and normal canvas size after closing. Desktop emulation does not prove native keyboard behavior.

### Installable PWA — 2026-10-31

- Node regression coverage in `pwa.test.js`: static shell/asset cache and offline navigation under `/flowtree/`, no interception of Google requests, authorization headers, writes, query-bearing assets or unrelated pages; scope-specific old-cache cleanup; relative manifest start/scope and actual PNG dimensions.
- Build with `VITE_BASE_PATH=/flowtree/ npm run build`, then preview with the same base at port 4173. Verify manifest has no errors, standalone display, correct start URL/scope, 192/512px PNGs and a maskable icon. iOS uses the 180px Apple touch icon. The manifest's default identity follows its start URL, avoiding a shared-origin root identity on GitHub Pages.
- At phone width, Account → Install Flowtree offers the native prompt where supported; otherwise it shows platform instructions. In standalone mode the install action is hidden. Dismissal must leave the app usable and permit trying again.
- After an online load, disable HTTP cache and network for that test tab, then reload. Expect the app's reconnect screen (not a browser network error or empty plan pretending to be restored). Re-enable network, then choose Open Flowtree. During an already-open editing session, losing the network must preserve the draft and display the reconnect/save reminder.
- Update scenario: keep a draft open in one production preview window, rebuild, and open a second window to discover the new worker. Expect Update ready without closing the editor or reloading the first window. Save/discard the test draft, close all preview windows, then reopen to activate the new version. Other app caches must remain intact.
- Physical-device acceptance: install from HTTPS on Android Chrome and iPhone Safari, launch from the icon, verify standalone layout and safe-area spacing, sign in to Google and restore/save a test plan, close/reopen, then repeat offline/reconnect and update checks. Native OS installation and actual Google OAuth inside standalone phone apps require device verification; desktop emulation cannot prove those flows.
- Verified in the production preview at `/flowtree/`: browser manifest parser reports no errors, standalone display and correct `/flowtree/` identity/start/scope; mobile Account install fallback and iPhone Safari instructions render; network-disabled reload with HTTP cache disabled loads the offline reconnect screen; reconnect opens the app. A newly discovered worker showed Update ready while the first window retained the exact unsaved editor draft. Closing the test windows activated the new manifest. No real Google sign-in or OS installation was performed.

### Floating glass mobile footer — 2026-10-31

- Open `/tests/browser/mobile-footer.html` on Vite. The browser regression uses the real offline app in an iframe and reports PASS/FAIL for 320×740, 390×844, 568×320, 768×1024, 1366×768 and 1920×1080. It checks edge insets, all five 44px touch targets, content/menu clearance, simulated 34px home-indicator spacing and desktop hiding. All 18 assertions passed locally. This is separate from `npm test`.
- Manual: on a phone, scroll Home and Sinking funds, open Loans and the More destinations, and open Account. The rounded footer must stay inset from curved edges; content, notices and menus must remain above it. Tab/Enter should activate navigation with visible focus. Check light/dark mode and reduced transparency, plus Safari and installed-app home-indicator spacing. Unsupported blur uses a solid background.
- Verified at 390×844: light footer screenshot, keyboard Account opening/focus, and dark translucent background with 20px blur. Real iPhone safe-area behavior, reduced-transparency OS setting and every dedicated screen were not manually repeated. The original user tab stayed open without reload.

### Mobile editor action spacing and Save visibility — 2026-10-31

- The mobile form footer uses a zero sticky offset and 16px vertical padding, with an opaque continuation through the dialog's bottom padding. Form fields must not peek out underneath the actions.
- `/tests/browser/mobile-card-editor.html?mode=edit`, `?mode=add`, and `?mode=edit&keyboard=1` now assert that the primary action is already visible before scrolling, has at least 16px below it, and reads Save changes for editing or Add to tree for creation. Verified all three modes at 320×740, 390×844, 568×320, 768×1024 and 1366×768.
- Manual scenario: open an existing card's Edit details and a new card's Add child. Scroll to both ends, open/dismiss the phone keyboard, and verify Cancel and Save changes/Add to tree remain visible with space beneath them. Close the dialog: the main plan Save must be visible at top right when connected to Drive or in offline test mode. Verified its visible bounds at 390×844 in the offline app. Real phone keyboard behavior remains a device check.

### Section header breadcrumbs

- Run `/tests/browser/section-breadcrumbs.html`: navigate all six dedicated sections and Home root in the real offline app; none should render the Whole tree breadcrumb. Home branch navigation retains its breadcrumb when drilled into a branch.
- Manual: at phone and desktop widths, switch Home, Sinking funds, Loans, Life goals, Recurring payments, Investments and General ledger. No Whole tree label should appear above a dedicated screen; its own title and the Save controls remain available.

### Delete button appearance

- The shared dialog Delete action has an outlined red button in light and dark themes. Existing confirmation remains unchanged.
- The mobile-card-editor browser regression checks a visible solid outline and minimum button height in edit and manage modes. Manually open card info and Edit details: Delete should look like a button, with the same corner radius as the other actions; selecting it must still show confirmation before deletion.

### Mobile alignment audit — 2026-10-31

- Guidance reviewed: Apple Human Interface Guidelines/Layout, WebKit's Designing Websites for iPhone X, and web.dev Accessible tap targets. Retain the browser-managed safe viewport rather than enabling edge-to-edge cover without handling every top-level surface.
- Editor action area now has one 16px inset, 48px button heights and a full-width separator; removed stacked margins and the painted bottom extension. Non-form dialogs retain bottom padding. Footer uses an explicit safe-area-constrained width and 16px side gutters. Mobile canvas no longer inherits the 540px desktop minimum height, which failed at 740×360.
- Verified 36 editor/add/info/simulated-keyboard cases at 320×740, 360×800, 390×844, 430×932, 568×320, 740×360, 768×1024, 1366×768 and 1920×1080. Expanded footer regression passes all nine sizes, including simulated 34px bottom and 44px landscape side insets. The fixture's diagnostic output is hidden to avoid causing viewport widening after its checks.
- Device acceptance still required: Safari and installed PWA, portrait/landscape, browser toolbar expansion/collapse, native keyboard, text-size changes, light/dark appearance. Check every dedicated screen, scroll to its last card, open Account/More, and confirm no side clipping or controls hidden by the home indicator. Desktop emulation does not establish physical-device acceptance.

### Mobile alignment follow-up

- Actual phone-emulated Home inspection found Account's label 2.125px lower than its peers because its avatar occupied a taller auto-sized grid row. Fixed icon/label tracks now align all five labels; the footer regression asserts this across six phone sizes and retains tablet/desktop hiding checks.
- Header controls, More/Account panels and dialogs now use consistent 16px side gutters. Dialog max-width explicitly overrides the browser's default dialog cap. Verified the footer regression at all nine sizes; tests, lint and build pass. Installed iOS/PWA rendering and the reported blank startup remain unverified/unresolved by this visual change.

### Exclusive mobile footer highlight

- Opening More or Account temporarily removes the underlying section's visual highlight; closing the menu restores it. The underlying page retains aria-current because opening a menu does not change pages.
- Footer browser regression verifies More is the sole active item and Home is restored after closing, across six phone sizes. Manual: repeat from Sinking and Loans, dismiss by backdrop/Escape, then select a different section; exactly one footer control should be highlighted. Browser fixture, Node tests, lint and build passed.

### Mobile footer bottom breathing room

- Footer sits 20px above the safe area's bottom, including an extra 20px above any reported home-indicator inset. Shared clearance moves canvas boundaries and menus with it.
- Browser regression asserts at least 20px bottom spacing and 54px with a simulated 34px safe inset. Check portrait and short landscape on-device; native Safari/PWA safe-area reporting still needs physical verification.

### Translucent footer appearance

- Blur-capable browsers render the footer with 55% light/dark surface opacity and translucent active tabs. Unsupported blur and reduced-transparency preferences retain solid surfaces.
- Manual: inspect Home and More in light/dark themes on a phone; labels must stay legible, only one footer tab is highlighted, and the raised bottom spacing remains unchanged. This is a frosted-glass treatment, not native iOS Liquid Glass rendering.

### More menu account duplication

- More contains section shortcuts and theme switching only. Profile, sign-in, sign-out and Drive account actions remain in Account.
- Footer browser regression checks More has no duplicate account section at phone sizes. Manually check signed-in and signed-out Account still exposes the corresponding account actions.

- Mobile theme switching lives in Account only; More now contains section shortcuts only. Footer regression checks the theme action is absent from More and present in Account across phone sizes. Manual: Account → Use dark mode, then reopen Account → Use light mode; the theme should change and the menu should dismiss each time.

### Glass footer over scrolling content

- Mobile content extends to the bottom of the screen beneath the floating glass footer instead of ending at a blank footer strip. Bottom content padding and scroll padding equal the shared dock clearance, so the last item can scroll fully above the dock. More/Account still open above the dock.
- Footer regression replaces the old viewport-ending-above-dock expectation with viewport-to-bottom, sufficient scroll-end padding and last-card visibility checks. Manually scroll Home, Sinking and dedicated lists: content should blur beneath the pill, while the last item's actions remain reachable. This follows Apple's floating tab-bar pattern; web blur does not reproduce native Liquid Glass refraction.

### Slide across footer tabs

- A horizontal drag previews the tab under the pointer and activates it on release. Tap and keyboard actions remain native buttons. Vertical gestures do not select tabs; pointer cancellation or release outside the buttons cancels selection. More/Account open only on release.
- Browser regression includes synthetic pointer preview/release/cancel checks (capture is stubbed only for synthetic events). Native browser drag was separately verified from Home to Loans in a 390×844 actual offline app. Physical iPhone touch still needs device verification. Repeat Home→Sinking→Loans, drag to More/Account, cancel outside the bar and scroll vertically near it; no duplicate activation or lost vertical scrolling should occur.

### PWA release consistency and startup recovery

- Installation now fetches shell/assets with HTTP cache bypass, rejects failed responses and rejects HTML that does not reference the expected JS/CSS before publishing the new cache. The old worker remains usable if installation fails; no forced reload or skip-waiting was added.
- Navigation checks the cached JS/CSS exists before returning cached HTML. An incomplete cache falls back to a fresh online navigation; offline/failing navigation returns a small reconnect/retry page. Initial HTML contains a readable startup fallback if the main bundle fails before React mounts. None of these paths clears plan storage, account data or Drive files.
- Automated worker tests cover stale/mismatched HTML, non-200 assets, offline install, missing cached bundles, fresh-network fallback and offline recovery. Existing allowlist/privacy and scope-cleanup cases remain.
- Verified production preview under `/flowtree/`: initial startup and reload without console errors; after disabling both network and HTTP cache, reload serves the app's offline reconnect screen from the installed service worker. Actual iPhone 17 standalone update failure has not been reproduced, so these are verified robustness fixes, not a confirmed diagnosis of that device.
- Device regression: install once, sign in/save a test plan, then deploy two successive releases. Close all app windows after saving, reopen and verify each version without reinstalling; repeat with interrupted connectivity. A failed release must leave the prior installed shell available; no blank screen or plan reset should occur.

### Device theme and remembered Google account

- Theme uses persistent local storage with migration from the previous session preference; session storage remains a fallback when persistent storage is blocked. Verified selecting dark mode in Account and opening a fresh offline app tab restores `theme-dark`.
- Remember only the last authorized Google email in persistent storage. Ordinary reconnect uses that login hint without forcing consent/account selection; explicit Add or switch account still requests the chooser and ignores the hint. Logout forgets the hint. Access tokens remain session-only: browser-only Google Identity Services requires a user gesture to renew expired authorization; this does not implement permanent signed-in sessions or server refresh tokens.
- `devicePreferences.test.js` covers session loss, migration, switching back to light, remembered-account options, explicit switching, logout and unavailable storage. Storage exceptions no longer turn a successful Drive restore into a sign-in error.
- Device/manual: close/reopen installed PWA after selecting each theme; verify persistence. Connect a test Google account, close/reopen, and use Sign in: account selection/consent should not be forced by Flowtree, though Google may require interaction. Switch accounts, sign out and verify the remembered account is cleared. Actual Google OAuth and native iPhone standalone persistence are not verified locally; do not claim permanent login.

### Sinking funds independent expansion

- Sinking funds now uses independent branch expansion on both mobile and desktop, including when the desktop canvas is pinned. Opening another section no longer replaces a single navigation path and closes previous sections.
- Node regression in `treeExpansion.test.js`: open section A, expand its nested child, open section B, then close B; A and its nested expansion must remain visible. Original state remains immutable.
- Browser scenario `/tests/browser/sinking-expansion.html`: close two top-level sections, open A, open B, verify both expanded, close B and verify A stays expanded. Passed at 320×740, 390×844, 568×320, 768×1024, 1366×768 and 1920×1080. Uses the offline sample; no plan is saved.
- Manual follow-up: repeat with deeply nested annual cards and a pinned desktop view; toggle only the intended branch and verify its sibling children remain visible and connectors aligned. Pin-specific persistence was not manually rechecked in this change.

### Loan repayment schedule stays inside its card

- Fixed the loan-details grid item's automatic minimum width so the wide schedule scrolls within its own container. Reserved scrollbar space keeps card widths stable, and disabled outer scroll anchoring prevents a jump when the schedule is inserted. Table scrolling is contained, and its scroll region is keyboard-focusable and named.
- `/tests/browser/loan-schedule-layout.html` opens a real offline loan, records card width/position and outer scroll position, expands the full schedule, scrolls the table horizontally/vertically, then collapses it. Checks no page-width overflow, no opening jump, unchanged card geometry and bounded table height. Passed at 320×740, 390×844, 568×320, 768×1024, 1366×768 and 1920×1080. Phone preview also measured 350px card inside a 390px viewport after expansion.
- Manual: Loans → select House Loan → View full repayment schedule. The page must stay in place; swipe within the table to see all columns/months, then hide/reopen it. Tab to Full repayment schedule and use arrow keys. Repeat portrait/landscape and with a long loan name/large amounts; original sample uses ₹80,00,000 principal. Native iPhone touch scroll chaining still requires device verification.

### Sequential mobile section swipes (supersedes drag-to-icon/More behavior)

- Swipe left for the next section and right for the previous: Home → Sinking → Loans → Goals → Recurring → Investments → Ledger. Stop at both ends. The footer shows real, horizontally arranged section tabs and scrolls the active label into view. More is removed; Account remains a separate tap-only button. Its theme/account actions are unchanged.
- Horizontal gestures work on the footer and noninteractive page content. Vertical/short gestures, browser-edge gestures, dialogs/open editors, input controls and horizontal tables/lists must not change section. Taps and keyboard button activation remain available. No forced navigation animation is added.
- `sectionNavigation.test.js` covers complete forward/back traversal, endpoint clamping and invalid/vertical/diagonal gestures. Updated `mobile-footer.html` retains safe gutters, bottom padding, touch targets, label alignment, last-card reachability, Account separation and tablet/desktop hiding checks, replacing superseded More and drag-to-target assertions with sequential traversal and active-tab visibility at six phone sizes. Includes synthetic content-touch/vertical/table-gesture tests. Actual browser mouse drag in phone emulation from Loans to Goals verified the Goals screen and label. Physical iPhone touch remains a device acceptance check.
- Manual: swipe both directions through every section, try past Home/Ledger, tap a partially visible tab, rotate, use Tab/Enter, open Account and toggle theme. Scroll a repayment table sideways and edit a form: these actions must not navigate. Verify Account never opens from a section swipe and that no section disappears behind the footer.
