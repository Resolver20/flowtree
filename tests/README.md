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
