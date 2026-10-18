# Flowtree agent-workstream guide

Use the main **Flowtree — Coordinator** chat for every new request. It decides whether the work belongs to one focused workstream or needs several in parallel, then delegates only bounded, independent pieces.

## Shared knowledge

Every workstream must read `AGENTS.md` first. Use `README.md` for product behaviour, `REACT.md` for implementation rules, `VITE.md` for tooling, and `DESIGN.md` before visual work. Read the brief for the workstream before acting.

The current codebase is a browser-local React 19 and Vite application written in JavaScript and JSX. Its financial rules live in `src/domain/`; persistent plan state is owned by `App.jsx` and `useFlowData.js`; the active tree UI is under `src/features/flowtree/`.

## Routing rules

- **Developer implementation**: owns the bounded code patch for a user request. Before editing, documents the current flow; after editing, documents the new flow, rationale, exact files, preserved behaviour, validation, and risks.
- **UI and accessibility**: visual layout, responsive behaviour, interaction, keyboard focus, and CSS.
- **Finance domain**: planning calculations, tree data, loans, goals, import/export validation, and domain tests.
- **Quality review**: read-only investigation, test gaps, regressions, and validation plans.
- **Integration and release**: Google Drive sync, build/deployment configuration, documentation, and release checks.

For parallel requests, give each workstream a non-overlapping file or responsibility boundary. Do not ask multiple workers to edit the same files. The coordinator combines findings and remains responsible for the final decision and verification.

Implementation and review are separate responsibilities. The developer makes a precise, minimal patch; UI, finance, QA, or integration review only the relevant surface before release.

## Permanent release gate

Every code change follows this release sequence:

1. Route the implementation to the **Developer implementation** workstream.
2. Have the **Flowtree Code Reviewer** release-gate chat independently review the completed change before it is released.
3. Resolve or explicitly accept the review findings, then commit the reviewed change with a precise imperative Git message.
4. Deploy that commit to GitHub Pages.

Do not skip, reorder, or combine the implementation and independent-review steps. This gate applies to every code change, regardless of size; documentation-only work continues to follow the normal documentation and validation guidance unless it also changes code.
