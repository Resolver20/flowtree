# React Delivery Checklist

Use this before merging or sharing a feature.

## Product and UI

- [ ] Primary user task is clear and works end-to-end.
- [ ] Loading, empty, error, invalid-input, and success states are intentional.
- [ ] Desktop and narrow mobile layouts are checked in a real browser.
- [ ] Buttons, form fields, dialogs, and navigation work by keyboard with visible focus.
- [ ] No clipped text, unexplained placeholder, accidental overflow, or browser-default-looking control remains.

## React and code

- [ ] State is minimal; computed data is derived rather than duplicated.
- [ ] Effects synchronize with an external system only.
- [ ] Business rules are pure, named, and tested outside UI rendering.
- [ ] Components have one understandable responsibility and names describe their purpose.
- [ ] There are no debug logs, unused imports, dead components, or unrelated refactors.

## Data and security

- [ ] Client validation is present where useful; server/API validation and authorization remain authoritative.
- [ ] No secret, token, database credential, or sensitive data is bundled into browser code.
- [ ] Every resource operation is authorized for the current user on the server.
- [ ] User input is validated and never concatenated into queries or commands.
- [ ] Errors are useful to users and safe to log; logs avoid sensitive information.

## Verification

- [ ] Relevant unit/integration tests were added or updated.
- [ ] `npm run build` passed.
- [ ] `npm run lint` passed.
- [ ] `npm test` passed.
- [ ] The final change summary states exactly what was manually tested and any known limitation.
