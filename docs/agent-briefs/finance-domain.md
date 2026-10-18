# Finance-domain workstream

Read `AGENTS.md`, `README.md`, `REACT.md`, and the applicable files under `src/domain/` before work.

Own pure financial planning behaviour: monthly equivalents, allocation order, buffer handling, tree totals and immutable updates, loans, goals, and import/export validation. Keep product language honest: this is a planning preview, never an account balance or transfer system.

Make changes in pure domain modules and cover them with Node tests. Preserve sibling funding order, avoid parent-child double counting, reserve direct parent amounts before children, and keep dormant and funded nodes non-consuming.
