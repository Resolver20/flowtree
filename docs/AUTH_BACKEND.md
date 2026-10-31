# Persistent sign-in backend

Deployment status, 2026-10-31: the website and Worker are deployed at https://flowtree.aasrithvakul.workers.dev on the account's Free plan. The encryption key and Google client secret are installed as Worker secrets. The owner saved the Cloudflare callback, and the downloaded client configuration confirms it. The live `/auth/session` endpoint returns `configured: true`. Real-account login and restore verification are still pending; the automated in-app browser currently cannot load the host despite successful HTTP responses. The existing GitHub Pages app and repository homepage link remain unchanged until login is verified. Do not describe the hosting cutover or real-device sign-in as complete yet.

After verification, set the GitHub repository variable `FLOWTREE_HOST_URL` to the new HTTPS origin and deploy the Pages workflow. It will publish a migration page with an explicit Open Flowtree link and an update that waits for existing windows to close. Preserve this separation so users are not moved to an unconfigured sign-in flow.

Owner credential handoff: create and download the new Google Web-client credential JSON in Google Cloud, then run `node scripts/configure-google-secret.mjs /absolute/path/to/downloaded-client.json` locally. This passes the secret directly to Wrangler over stdin without printing it or saving it in the repository. Do not paste the JSON into chat, commit it, or place it in public assets. The registered Google callback is `https://flowtree.aasrithvakul.workers.dev/auth/callback`. Do not rotate or disable an existing secret until the new login has been verified.

The normal `npm run build` remains the browser-only GitHub Pages build. `npm run build:server` creates a root-hosted build for the Worker in `wrangler.jsonc`. The frontend and Worker must share **one HTTPS origin**. Do not upload the server-mode bundle to GitHub Pages: Pages cannot run these endpoints.

## What changes

Google's authorization-code flow uses an HttpOnly, Secure, SameSite=Lax session cookie, PKCE and a one-use cookie-bound state. Google access and refresh tokens live only in an AES-256-GCM encrypted Durable Object record, bound cryptographically to that object. The browser receives user metadata and Drive responses, never Google tokens. A non-secret transport marker selects the same-origin Drive proxy.

Sessions expire after 30 days from sign-in, including server-side expiry and an expiry alarm. Access refresh happens when less than a minute remains. Refresh requests and logout serialize inside each object. Temporary Google/network failures keep the session; a revoked refresh grant deletes it. Ordinary logout deletes this session and credential, without revoking Google's entire grant or signing out other devices. It does not delete Drive files.

Financial plans remain in Google Drive's `gpt` folder. The backend forwards requested plan data transiently; it does not persist plans. Startup only discovers and validates backups. Multiple valid files still require an explicit choice. Creation and uploads still need the existing explicit setup/Save actions. No session or OAuth/API response is cached by the service worker.

The server administrator necessarily controls the runtime and encryption key and could access decrypted credentials. HttpOnly/encryption prevents routine frontend exposure; it is not a claim that credentials are invisible to the operator or Cloudflare. Protect administrative access and secrets. Cookies can still be cleared by the user or OS, Google may revoke access, and OAuth applications in Testing can have short-lived refresh grants. These conditions can require signing in again.

## Local setup

1. Copy `.dev.vars.example` to `.dev.vars`. These files and `.wrangler/` are ignored. Real values must never appear in tracked files, browser storage, screenshots, logs, or chat.
2. Use a separate development **Web application** OAuth client. Set its exact authorized redirect URI to `http://localhost:8787/auth/callback`. Only the local loopback origin permits `DEV_INSECURE_COOKIES=true`; production always requires HTTPS and Secure cookies.
3. Fill `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` and a 32-byte base64url `AUTH_ENCRYPTION_KEY` locally. Generate the key with Node's `crypto.randomBytes(32).toString('base64url')` and place it directly in the ignored secret file. It must not use a `VITE_` prefix.
4. Run `CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV=false WRANGLER_SEND_METRICS=false npm run dev:server -- --local`. Wrangler builds the server-mode frontend automatically. Open `http://localhost:8787`. The explicit dot-env flag keeps existing frontend-only `.env.local` separate. Run one local Worker at a time, or use distinct `--persist-to` directories to avoid SQLite locks.
5. Mock browser regression: start `VITE_AUTH_MODE=server npm run dev -- --port 5192 --strictPort` and open `/tests/browser/server-auth.html`. This fixture replaces fetch with synthetic responses; it never signs in or contacts Google. See `tests/README.md` for cases.

## Before a separately authorized deployment

- Choose the final origin and confirm Workers/SQLite Durable Objects availability and Free-plan limits in the intended account. This code does not enable billing or create an account.
- Set `APP_ORIGIN` to the exact HTTPS origin with no path or trailing slash. Store the client secret and encryption key as **Worker secrets**, and configure the client ID on the Worker, not the frontend. Do not set `DEV_INSECURE_COOKIES` in production. Missing configuration fails closed.
- Register the exact production `/auth/callback` redirect in Google Cloud. Review the OAuth consent/Publishing status; refresh-token expiry for a Testing application is not solved by this backend. Keep only `drive.file` scope.
- Build using `npm run build:server`. Preserve the Durable Object binding and `v1` SQLite migration across releases. Changing the encryption key invalidates existing encrypted sessions; plan key rotation as a deliberate sign-out migration. Deployments with the same secrets/binding keep sessions.
- Login is throttled using a hashed Cloudflare-supplied IP (30 attempts/minute/location). This approximate abuse control can affect users on shared networks; it is not a global usage cap. Reserve the configured limiter namespace ID for this app within the account.
- Do not enable request-body/cookie logging or OAuth callback query logging in Worker observability, tracing, analytics or proxies. The provided Worker logs no tokens and disables observability. Keep OAuth codes out of access logs. API errors sent to the browser contain no raw upstream detail.
- Moving from a GitHub Pages origin to a new origin requires an initial login, and an installed PWA must point to the new origin. Do not promise existing installations migrate themselves.
- Complete real Google end-to-end testing and installed iPhone PWA close/reopen/update tests before calling this production ready. The local checks use mocks and cannot prove Safari's storage lifecycle or a real refresh grant.

## Validation and maintenance

`npm test` includes server encryption, state replay/CSRF, callback rotation, concurrent refresh/logout, transient failure, revocation, proxy restrictions and transport tests. `npm run lint`, both build modes, and `wrangler deploy --dry-run` check packaging without deploying. Never run a real deployment as part of local validation.

References: [Google server OAuth](https://developers.google.com/identity/protocols/oauth2/web-server), [Worker static assets](https://developers.cloudflare.com/workers/static-assets/binding/), [Worker rate limiting](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/).
