# FlowTree

FlowTree is a private, browser-first planning tool for understanding a monthly money plan as a hierarchy:

`income -> categories -> child destinations`

It shows where planned income would go, which target would be funded next, and what remains after the safety buffer and monthly targets. It includes dedicated views for sinking funds, loans, and life goals. It does not connect to a bank, move money, or claim that planned amounts are actual savings.

## Live site

After GitHub Pages finishes its first deployment, Flowtree is available at [resolver20.github.io/flowtree](https://resolver20.github.io/flowtree/).

## Quick start

Use a Node.js version supported by the installed Vite release. Then run:

```sh
npm ci
npm run dev
```

Open the URL printed by Vite. The port may differ when the default port is already occupied.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start Vite's development server with hot updates |
| `npm run build` | Create the production bundle in `dist/` |
| `npm run preview` | Serve the latest production build locally |
| `npm run lint` | Run Oxlint |
| `npm test` | Run the domain tests with Node's test runner |

Before handing off a code change, run:

```sh
npm test
npm run lint
npm run build
```

## Current experience

- The home screen keeps the income source on the left and reveals deeper levels to the right.
- Every sibling level is ordered by monthly total from highest to lowest, including children revealed when a node expands.
- Selecting a parent opens its children without moving already visible columns.
- **Expand everything** lays out the entire hierarchy in disjoint subtree bands and scales it to the viewport.
- Each node card shows a distinct Material Symbol, its name, and its monthly target.
- Yearly entries support a target date. Flowtree automatically calculates expected savings-to-date from the 12-month cycle, then divides the expected remaining balance across the months left.
- Every destination has one subtle info button beside its icon. It opens a read-first management dialog with **Add child**, **Edit details**, and **Delete**.
- Options contains only plan-level controls such as income, buffer, top-level categories, expansion, and sample mode.
- The footer explains the next unfunded target or the amount left after targets and buffer.
- Options allow income and buffer editing, destination creation, full-tree expansion, and a temporary sample flow.
- Google Drive sign-in is available from the profile menu. A connected user’s Drive plan is restored and later changes are saved automatically.
- Financial plan data is kept only in active React memory while the page is open. Old browser-local plan copies are removed.
- Options can export a portable JSON backup and import a validated JSON plan after a replacement preview.
- A destination picker provides direct keyboard/touch access to every nested item, with unscaled Edit and Add child actions.
- Forms preview monthly branch totals, support decimals and icon selection, and trap keyboard focus until closed (Escape cancels).
- The icon picker groups Material Symbols across banking, income, spending, housing, debt, protection, tax, life goals, investing, transport, and lifestyle categories.
- Subscription presets cover major streaming, music, cloud, productivity, AI, gaming, news, fitness, food, transport, telecom, and software memberships.
- Deletion explicitly previews the entire affected branch. Undo is available in the notification until it is dismissed, another plan change occurs, or the page reloads.
- New items are automatically selected. Custom category names and removed categories remain unchanged on reload; storage failures show a warning.

### How to use FlowTree

1. Start on **Home** and add income sources plus a safety buffer.
2. Add monthly destinations to the appropriate planning category.
3. Use **Sinking funds** for dated yearly payments, **Loans** for payoff projections, and **Life goals** for goal targets that also appear in Home.
4. Use the profile menu to sign in with Google Drive when you want to restore or save your plan in your own Drive.

Read the full [user guide](./docs/USER_GUIDE.md) or download the [PDF guide](./docs/FlowTree-User-Guide.pdf). For implementation details, see the [technical architecture](./docs/ARCHITECTURE.md).

## Financial model

The allocation preview is deterministic:

1. Reserve the safety buffer from monthly income.
2. Visit top-level categories in their visible array order.
3. Give each category up to its monthly target before funding the next category.
4. Within a parent, reserve the parent's direct amount first and pass the rest to its children in order.
5. Convert yearly targets to monthly equivalents by dividing by 12.

For dated yearly targets, expected progress is recalculated from the rolling 12-month cycle. The preview reserves `(target - expected saved) / months remaining` from future monthly income. With no target date, it uses the saved value and a 12-month fallback. This remains planning information and never moves money automatically.

The useful plan summary is:

```text
available = income - safety buffer - monthly targets
```

Show a positive result as **Available** or **Unassigned**. If the result is negative, show **Over-planned by ...**. This is planning information, not an account balance.

## JSON backup and import

Use **Account → Edit plan JSON** to open the current plan in Flowtree. You can edit it directly; Flowtree validates the JSON before replacing the active plan, then saves the validated version to Google Drive.

Import replaces the current plan. Export the current plan first when you may want to restore it later. An immediate **Undo** is available until the next plan change or page reload. Files larger than 2 MB, duplicate IDs, negative amounts, invalid dates, unknown statuses, excessive nesting, and unsupported export versions are rejected before any saved data changes.

The Drive file is intentionally a plain plan object—there is no wrapper, metadata, or export timestamp. You can also create or edit it outside Flowtree:

```json
{
  "profile": { "name": "You" },
  "incomeSources": [
    { "id": "salary", "name": "Salary", "amount": 60000 }
  ],
  "buffer": 5000,
  "tree": [
    {
      "id": "cash-flow",
      "name": "Cash Flow",
      "amount": 0,
      "children": [
        { "id": "rent", "name": "Rent", "amount": 18000, "children": [] },
        { "id": "insurance", "name": "Insurance", "amount": 12000, "period": "year", "dueDate": "2027-09-20", "children": [] }
      ]
    }
  ]
}
```

Authoring rules:

- Every income source and destination needs a unique, non-empty `id` within its own list.
- `amount`, `savedAmount`, and `buffer` are JSON numbers greater than or equal to zero. Do not put them in quotation marks.
- `period` is `"month"` or `"year"`.
- `status` is `"dormant"`, `"seeded"`, `"active"`, or `"funded"`.
- `dueDate` is optional and uses `YYYY-MM-DD`; it is normally used with yearly targets.
- Income `startDate` is optional and uses `YYYY-MM-DD`; `dayOfMonth` is optional and is an integer from 1 to 31 (default: 1). These fields describe the expected monthly income cadence for planning only; Flowtree does not schedule transfers.
- `children` is always an array. Use `[]` for the end of a branch, or nest more destination objects to continue the hierarchy.
- `savedAmount`, `dueDate`, `icon`, `tone`, and `note` are optional. Missing optional values receive safe defaults.
- Versioned Flowtree exports from earlier releases are still accepted for compatibility.

## Google Drive sync

Google Drive sign-in is optional. The app asks the user to sign in with their own Google account, creates or uses an app-owned private `FlowTree` folder, restores `flowtree-plan.json` when it exists, and saves later plan changes automatically. No Google credentials are stored in FlowTree data or committed to the repository.

The public [privacy policy](./public/privacy.html) and [terms](./public/terms.html) describe the limited Google Drive access used by the app.

To enable the feature for a deployed site, create a Google OAuth web client, add the deployed site origin to its authorised JavaScript origins, then add its client ID in the GitHub repository variable `GOOGLE_OAUTH_CLIENT_ID`. The deploy workflow passes that public OAuth client ID to Vite as `VITE_GOOGLE_CLIENT_ID`. See [Google Drive sync setup](./docs/GOOGLE_DRIVE_SYNC.md).

## Deployment

Pushing to `main` runs the included GitHub Pages workflow. It builds the Vite app with the `/flowtree/` base path and publishes `dist/`. In repository settings, set **Pages → Build and deployment → Source** to **GitHub Actions** once; future pushes deploy automatically.

## Project map

| Path | Role |
| --- | --- |
| `src/main.jsx` | React root and Strict Mode |
| `src/App.jsx` | App composition, dialogs, and persistent actions |
| `src/features/flowtree/EnergyExplorer.jsx` | Feature composition, navigation, demo state, and allocation-derived view state |
| `src/features/flowtree/TreeCanvas.jsx` | SVG connectors, root node, and positioned tree cards |
| `src/features/flowtree/treeLayout.js` | Pure column, subtree-band, and connector layout calculation |
| `src/features/flowtree/PlanDialog.jsx` | Income, buffer, node-editing, and child-creation dialogs |
| `src/features/flowtree/LoansView.jsx` | Loan inputs, payoff overview, and amortization schedule |
| `src/features/flowtree/GoalsView.jsx` | Dedicated Life goals creation and overview |
| `src/features/flowtree/EnergyExplorer.css` | Active visual system |
| `src/domain/flowTree.js` | Tree operations and monthly totals |
| `src/domain/energyFlow.js` | Pure plan-allocation algorithm |
| `src/domain/loan.js` | Pure monthly-payment and payoff schedule calculation |
| `src/hooks/useFlowData.js` | In-memory plan state and mutations |
| `src/domain/*.test.js` | Domain tests |

The earlier prototype screens, styles, and unused assets were removed. The active home screen is fully contained in `src/features/flowtree/`.

## Documentation

- [`AGENTS.md`](./AGENTS.md) — repository working rules
- [`REACT.md`](./REACT.md) — React architecture and coding conventions
- [`VITE.md`](./VITE.md) — development, assets, environment variables, and deployment
- [`DESIGN.md`](./DESIGN.md) — accepted visual and interaction system
- [`docs/USER_GUIDE.md`](./docs/USER_GUIDE.md) — non-technical product guide
- [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) — technical architecture

## Framework references

- [React documentation](https://react.dev/learn)
- [Vite guide](https://vite.dev/guide/)
- [Vite CLI](https://vite.dev/guide/cli)
