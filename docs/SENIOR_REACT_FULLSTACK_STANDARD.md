# Senior React Full-Stack Standard

Use this as the default engineering bar for Flowtree and future React work. It is intentionally practical: ship small, understandable changes that are safe to extend.

## 1. Start with a thin vertical slice

Before editing, write down: user outcome, one primary path, data required, empty/loading/error states, and how success is verified. Build the smallest end-to-end version first, then refine it. Do not start by adding libraries, abstractions, or a dashboard shell.

For each feature, answer:

- What can a user do when it works?
- What data is the source of truth?
- Which component owns each changing value?
- What happens if data is missing, slow, invalid, or the request fails?
- Which test proves the business rule and which manual check proves the UI?

## 2. React design rules

- Break a screen into components around visible responsibilities and user concepts, not arbitrary file-size limits.
- Keep `App` and route/page files as composition glue. Move feature logic, repeated controls, and complex rendering into focused modules.
- Keep state minimal. Store source data and user intent; derive totals, filters, labels, and visibility from them instead of duplicating them in state.
- Keep state at the closest common owner. Pass data down and events up. Introduce context only for truly cross-cutting state (for example auth, theme, locale), not to avoid normal props.
- Use effects only to synchronize React with an external system: browser storage, network, subscriptions, timers, or a third-party API. Do not use an effect to derive UI data from other state.
- Every asynchronous UI path needs explicit `idle`, `loading`, `success`, and `error` behavior where relevant. Prevent double submits and show a useful, recoverable error.
- Prefer semantic HTML (`button`, `label`, `nav`, `main`, `dialog`, headings) before adding ARIA. A clickable `div` is not a button.

The React team’s component/state model and its guidance to derive rather than duplicate state underpin these rules: [Thinking in React](https://react.dev/learn/thinking-in-react), [Managing State](https://react.dev/learn/managing-state), and [You Might Not Need an Effect](https://react.dev/learn/you-might-not-need-an-effect).

## 3. Project structure

Keep code near the feature it serves. A default shape:

```text
src/
  app/                 # app shell, providers, routes
  features/
    budgets/           # UI, feature actions, feature tests
  components/          # genuinely reusable presentation components
  domain/              # pure business rules and unit tests
  hooks/               # reusable browser/React hooks
  services/            # API clients, storage adapters, DTO mapping
  styles/              # tokens, reset, global styles
```

For Flowtree, keep allocation and tree rules pure in `src/domain`. UI components should call named domain functions, not reimplement calculations. Browser persistence belongs behind the existing data hook/adapter, never mixed into rendering code.

Use explicit names: `calculateAllocation`, `savePlan`, `isSubmitting`. Avoid `utils.js`, `helpers.js`, `data.js`, anonymous booleans, and generic components such as `CommonCard` until a real shared contract exists.

## 4. Data and backend boundary

Treat the browser as untrusted. Client validation improves UX; the server must still validate input, authorize the current user for every object, and enforce business rules.

- Define request/response shapes at the API boundary; map API data to UI-friendly models in `services/` rather than leaking transport fields through the component tree.
- Return stable, actionable error codes/messages. Log enough context to diagnose failures without logging secrets or sensitive financial data.
- Make write operations idempotent where retries are possible.
- Do authentication and authorization on the server. Never rely on hidden UI controls as access control.
- Keep secrets only in server-side environment configuration. Vite exposes only `VITE_*` values to browser code—therefore they must be treated as public.
- Use parameterized queries or a maintained ORM/query builder; never concatenate user input into queries.

Security work should be reviewed against the current [OWASP Top 10:2025](https://top10.owasp.org/2025/0x00_2025-Introduction/), especially access control, configuration, supply-chain, injection, authentication, and logging risks.

## 5. Visual and interaction quality

Design before implementation: state the primary task, hierarchy, responsive behavior, component states, spacing scale, colors, typography, and interaction feedback. Match the existing product’s visual system unless a redesign is requested.

- Use shared CSS tokens for color, spacing, radius, shadow, and type; avoid scattered near-duplicate magic values.
- Design loading, empty, error, disabled, focus, hover, selected, overflow, and mobile states—not only the happy-path screenshot.
- Use keyboard-visible focus, sufficient contrast, text labels for meaningful controls, and tap targets that work on mobile.
- Make responsive layout intentional: validate a narrow phone and a normal desktop viewport; do not merely let the desktop layout shrink.
- Keep animation purposeful, short, and compatible with `prefers-reduced-motion`.

## 6. Tests, reviews, and delivery

Test behavior at the cheapest meaningful layer:

1. Unit-test pure domain calculations, formatting, validation, and edge cases.
2. Add component/integration tests for important user flows when test infrastructure is present.
3. Manually exercise the exact UI path in a browser, including a narrow viewport.
4. Run build, lint, and tests before handoff. Do not claim an unrun check passed.

Every change should be reviewable: one purpose, small diff, no unrelated formatting churn, clear names, no dead code, and a concise summary of what changed, why, and how it was verified. Preserve existing user data and make migrations reversible or versioned.

## 7. Definition of done

A feature is done only when:

- the primary task works with real local state or the actual API;
- loading, empty, invalid, and failure cases have an intentional result;
- business logic is not duplicated in the UI;
- desktop and narrow mobile are usable and keyboard navigation works;
- no secret, private data, or authorization decision is exposed to the client;
- relevant tests plus `npm run build`, `npm run lint`, and `npm test` pass (or any exception is explicit);
- the final diff contains no debug logs, mock production claims, dead files, or accidental design drift.

## Sources

- [React: Thinking in React](https://react.dev/learn/thinking-in-react)
- [React: Managing State](https://react.dev/learn/managing-state)
- [React: Quick Start](https://react.dev/learn)
- [Vite: Env Variables and Modes](https://vite.dev/guide/env-and-mode)
- [OWASP Top 10:2025](https://top10.owasp.org/2025/0x00_2025-Introduction/)
