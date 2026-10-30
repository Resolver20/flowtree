# Flowtree tests

Run all automated tests from the project root:

```sh
npm test
```

Run one file when checking a specific behavior:

```sh
node --test tests/domain/treeExpansion.test.js
```

## Automated coverage

The 54 tests in `domain/` use Node's built-in test runner. Their names describe the behavior being checked.

| File | What it checks |
| --- | --- |
| [flowTree.test.js](domain/flowTree.test.js) | Editing and deleting nodes, annual targets, saved progress, hierarchy totals, migrations |
| [energyFlow.test.js](domain/energyFlow.test.js) | Allocation priority and preventing double counting |
| [loan.test.js](domain/loan.test.js) | Loan projections, extra payments, negative remaining balances, joint contributions |
| [monthlyHistory.test.js](domain/monthlyHistory.test.js) | Frozen monthly records, payment dates, changes applying to future months |
| [recurringPayments.test.js](domain/recurringPayments.test.js) | Monthly payment totals without counting children twice |
| [treeExpansion.test.js](domain/treeExpansion.test.js) | Reopening only immediate children and preserving other branches |
| [treeViewport.test.js](domain/treeViewport.test.js) | Readable card scale and keeping the first node reachable |
| [flowDataTransfer.test.js](domain/flowDataTransfer.test.js) | JSON validation, round trips, and supported financial fields |
| [restoreDriveSession.test.js](domain/restoreDriveSession.test.js) | Loading plans without waiting for Google profile details |
| [driveRestoreCandidates.test.js](domain/driveRestoreCandidates.test.js) | Valid backups, newest-first ordering, duplicate choices |
| [versionRecovery.test.js](domain/versionRecovery.test.js) | Five-version limit, download reuse, retries, bounded caching |
| [planVersionChanges.test.js](domain/planVersionChanges.test.js) | Descriptions of additions, modifications, renames, and deletions |
| [saveShortcut.test.js](domain/saveShortcut.test.js) | Recognizing Command+S and Control+S |

## Manual browser regression checklist

These checks are manual; `npm test` does not run them. Use the local offline copy for financial edits. Record the viewport and outcome when testing a release.

- Home: the first element is reachable; cards stay readable; connectors meet their cards while opening and closing branches.
- Responsive views: check phone portrait, phone landscape, tablet, laptop, and wide desktop for clipping and unintended page scrolling.
- Loans: outside clicks return read-only details to the preview; inside clicks keep the card open; outside clicks preserve edit drafts.
- Saving: Command+S and Control+S save once; open dialog drafts are protected; the confirmation disappears; manual save status updates correctly.
- Refresh: the selected section, monthly selection, and scroll position return after reloading.
- Version recovery: the dialog opens immediately; Keep current version preserves edits; closing during loading does not reopen it; selecting a snapshot alone changes nothing; loading a version does not upload it.
- Offline testing: Save persists only the browser test copy; refresh restores it; Drive stays disconnected.

The private offline JSON and `offline.local.html` are ignored by Git and are not test fixtures committed to this folder. Automated tests use their own synthetic data.
