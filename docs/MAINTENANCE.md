# Maintaining Flowtree

## Where changes belong

- `App.jsx`: compose screens and translate user actions into plan mutations.
- `hooks/useFlowData.js`: own the active plan and its Undo/Redo history.
- `hooks/useGoogleDrivePlan.js`: own Drive connection, setup, explicit saves and recovery.
- `lib/googleDriveSync.js`: Google authentication and HTTP requests.
- `domain/`: pure calculations, import validation, comparisons and testable recovery loading.
- `features/flowtree/`: screens, forms, tree layout and presentation.

Keep a single tree record for each loan, goal or investment. Dedicated screens and Home edit the same record. Keep money calculations in domain modules and preserve the existing JSON format.

## Behavior to preserve

- Drive saves are manual. Editing, Undo, Redo and loading an earlier version do not upload.
- Recovery displays five valid versions with timestamps and named changes compared to the preceding available saved version. A sixth snapshot supplies the last comparison; no older versions are deleted.
- Deleting a child preserves its parent and siblings. Built-in root categories are protected.
- Home supports independent card expansion. Undo/Redo controls remain compact.
- Loan projections retain signed remaining principal and the user's joint-loan monthly contribution.
- Annual targets and goals retain saved progress, dates and monthly equivalents.
- Save notifications dismiss automatically and have a close button.

The active plan currently lives in React memory. Refreshing restores the connected Drive file; edits must be manually saved first. This describes current behavior, not a new persistence policy.

## Known requirement gap

The recurring calendar currently derives scheduled amounts from the active plan. It does not freeze historical paid-month snapshots. Implementing the previously requested month locking requires a separate data-model change and migration; this cleanup deliberately preserves existing calendar behavior.

## Validation

Run `npm test`, `npm run lint`, and `npm run build`. Exercise affected screens with disposable data. Verify Drive with a test account before claiming cloud integration coverage; avoid modifying a user's real plan during regression checks.
