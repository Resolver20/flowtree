# Google Drive sync

Flowtree can use Google Drive as an optional JSON backup location. The browser client uses only Google Identity Services and the Google Drive API with the least-privilege `drive.file` scope. It does not connect to Gmail, Calendar, Contacts, or any other Google API.

## One-time OAuth setup

1. In Google Cloud Console, create or select a project and enable **Google Drive API**.
2. Create an OAuth **Web application** client ID.
3. Add the Flowtree origin to the client’s authorised JavaScript origins (for example `http://127.0.0.1:5178`).
4. For local development, set `VITE_GOOGLE_CLIENT_ID` in `.env.local` (see `.env.example`). For GitHub Pages, add the same value to repository variable `GOOGLE_OAUTH_CLIENT_ID`; the deploy workflow supplies it at build time.
5. Open Flowtree. Google sign-in is the first screen. The app signs the user in, restores `flowtree-plan.json` if present, and saves later changes automatically.

The `drive.file` scope limits access to files the app creates or files the user explicitly opens with the app. The token is held in memory only; Flowtree does not store Google credentials in local storage. When a signed-in account has no Flowtree backup yet, the app creates a clean plan containing only the starter categories. It never uploads a previous browser user's cached plan into a new Google account.

The existing exported plan can be uploaded to the `gpt` folder as `flowtree-plan.json`. Store the folder ID in app settings rather than hard-coding a user account or password.
