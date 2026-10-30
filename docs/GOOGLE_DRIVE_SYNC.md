# Google Drive sync

Flowtree can use Google Drive as an optional JSON backup location. The browser client uses only Google Identity Services and the Google Drive API with the least-privilege `drive.file` scope. It does not connect to Gmail, Calendar, Contacts, or any other Google API.

## One-time OAuth setup

1. In Google Cloud Console, create or select a project and enable **Google Drive API**.
2. Create an OAuth **Web application** client ID.
3. Add the exact Flowtree origins to the client’s authorised JavaScript origins: `http://127.0.0.1:5173` for local development and `https://resolver20.github.io` for GitHub Pages. Do not add the `/flowtree/` path. This browser token flow does not need an authorised redirect URI.
4. For local development, set `VITE_GOOGLE_CLIENT_ID` in `.env.local` (see `.env.example`). For GitHub Pages, add the same value to repository variable `GOOGLE_OAUTH_CLIENT_ID`; the deploy workflow supplies it at build time.
5. Open Flowtree and select the profile menu, then **Sign in with Google**. The app looks only in the private `gpt` folder, restores a valid `flowtree-plan.json` if present, and saves later changes only when the user selects **Save to Google Drive**. When several valid files exist, it lists them newest first for an explicit restore choice.

If the sign-in control reports that Google Identity Services did not load, use a normal browser with popups and third-party Google scripts allowed. Confirm that the deployed origin is registered exactly as an origin, for example `https://resolver20.github.io` (not `https://resolver20.github.io/flowtree/`). If the consent screen remains in Testing, the signing-in account must be listed as a test user.

The `drive.file` scope limits access to files the app creates or files the user explicitly opens with the app. The token is held in memory only; Flowtree does not store Google credentials in local storage. When a signed-in account has no valid Flowtree backup in `gpt`, Flowtree keeps the current browser plan unchanged until the user explicitly chooses to create an empty Drive plan or save the current plan. It never uploads a previous browser user's cached plan into a new Google account.

The connected account owns the app-created private `gpt` folder and its `flowtree-plan.json` file. Flowtree discovers only that folder after sign-in; it does not hard-code a user account, folder ID, or password.
