# Mobile PWA release checks

Audit date: 2026-10-31. These results distinguish browser tests from physical-device tests. No live Google account or Drive file was changed. Nothing was published.

## Results

| Condition | Result and evidence |
| --- | --- |
| Manifest and app identity | Production browser parsed the manifest without errors: standalone display, correct root scope/start URL and three icons. PNG dimensions, Apple 180px icon, relative Pages paths and zoom-friendly viewport are checked in `tests/domain/pwa.test.js`. Visually inspected the maskable icon. This does not prove native installation. |
| Production service worker | Actual production builds installed and controlled pages at `/` and `/flowtree/` on isolated localhost origins. Both cached launches showed the offline screen under browser network emulation. |
| Cold offline launch | Shows You’re offline with a disabled Open Flowtree button. It does not open a Drive plan offline. Reconnecting enables the button; activation opens the app. |
| Connection lost during editing | Actual production editor kept its draft and remained open; the offline notice appeared. Reconnecting did not reload or erase that draft. |
| Update with an editor open | Built a new production release while the old one controlled an open editor. The worker waited, the Update ready notice appeared, and the draft stayed unchanged. After cancelling the disposable draft and closing the sole test window, reopening activated the new cache and removed the old scoped cache. No forced reload or reinstall. |
| Incomplete deployment / cache eviction | Domain worker tests reject mismatched HTML, failed downloads and offline installs; missing cached bundles use online navigation or an offline recovery page. In a production-browser eviction probe, fresh navigation remained usable and dark preference survived. Full worker-network disconnection was not available through this browser's CDP target controls, so the offline eviction recovery page is verified by the domain test, not claimed as a real browser-network result. The isolated test cache was repaired afterward. |
| Dark mode | Set via the production Account menu; survived reload and closing/reopening the test window. Cold offline launch now retains that dark theme too. |
| Phone notch, home indicator, landscape sides | Added `viewport-fit=cover`; header, content, sheets and dialogs now respect the same safe-area variables as the dock. `pwa-safe-areas.html`: 115 checks pass at five portrait/landscape sizes with simulated insets. |
| Keyboard and dialogs | `editor-sizes.html`: 66 edit/add/manage scenarios pass, with and without simulated keyboard and safe-area insets. Inputs remain at least 16px; actions remain reachable. These are simulated visual viewports, not a physical iOS keyboard. |
| All sections | `responsive-boxes.html`: 5,220 checks pass in both themes at nine sizes. `full-app-layout.html`: 593 checks pass for all seven integrated screens. Mobile footer regression also passes. |
| Offline/reconnect UI | `pwa-offline.html`: 48 checks pass in both themes at six portrait/landscape/tablet sizes. Storage is synthetic and isolated inside the fixture. |
| Google first login | Synthetic browser OAuth: one authorization in an active keyboard user gesture, setup choice reached, zero writes. Blocked and closed popups show the correct retryable error. SDK-load failure can be retried without opening a delayed popup. |
| Temporary Drive failure | Synthetic 503 retains the session; Retry restores successfully without OAuth and with zero writes. |
| Expired Google token | Synthetic 401 clears the expired session and presents Reconnect Google Drive, with zero writes. Device-preference tests cover remembered-account hints, explicit account switching and blocked storage. Tokens remain session-only; this is not permanent authentication. |
| Installation instructions | iPhone user-agent simulation showed Safari Share → Add to Home Screen instructions. Android simulation showed Install app / Add to Home screen guidance. Actual OS installation was not performed. |
| Reduced motion | Production browser emulation reported reduced motion active and tree transition duration `0s`. |

## Repeatable local checks

1. Run `npm test`, `npm run lint`, and `npm run build`.
2. Use an isolated preview origin: `npm run preview -- --host 127.0.0.1 --port 4187 --strictPort`. Do not test credential/storage mutations in the user's open app origin.
3. Open the production root, wait for its service worker to activate, and confirm it controls the page. Enable offline network emulation and reload. Reconnect and select Open Flowtree. Repeat with a Pages-path build: `VITE_BASE_PATH=/flowtree/ npm run build -- --outDir .local/pwa-pages`, then preview with that outDir and `--base /flowtree/` on a different port.
4. For update testing, leave a disposable editor draft open, build a changed version, and request a worker update. Expect an installed waiting worker, an update notice and the same draft value. Cancel the disposable draft, close every window on that isolated origin, reopen and verify only the new scoped cache remains. Keep real user edits saved before closing.
5. Run the browser fixtures above through Vite. Google/Drive fixtures must use an isolated test origin: they use synthetic tokens and responses. `google-sign-in.html` supports normal, blocked, closed and load-error modes. `drive-restore-retry.html` supports the temporary-error flow and `?expired=1`.

## Physical-device checks still required

These remain unverified. This Mac/browser test session has no control of the user's iPhone or an Android device.

- Install from Safari on iPhone and Chrome on Android; confirm icon, launch screen, standalone presentation and return from external authentication.
- Test real Google sign-in, Drive restore and an explicitly authorized save. Close normally, force-close and reopen; distinguish ordinary network failure from genuinely expired authorization. A new browsing session may need reconnect because credentials are session-only.
- Install an earlier release, save a disposable plan, update, close/reopen, and confirm the latest version loads without reinstalling and the saved Drive plan is unchanged.
- Use real keyboards, date pickers and autocomplete on short/tall phones; rotate with an editor open. Check zoom, focus, Cancel/Save, notch, home indicator and browser-bar resizing.
- Launch in airplane mode, background/resume, reconnect, then verify the existing draft or readable reconnect state. Check OS storage eviction and low-memory termination on-device.

Native installability-error inspection was unavailable in the in-app browser; successful manifest parsing is not presented as install certification.
