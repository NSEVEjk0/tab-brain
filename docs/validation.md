# What we checked

Checked on November 18, 2026, using Node 24 for the app, Node 22 for the email backend, and real Chromium for browser checks. The public app is at https://tab-brain-memory.vercel.app.

| Check | Result |
| --- | --- |
| App unit tests | 43 passed across six files. |
| Production build | TypeScript, the web build, extension, offline shell, and both download packages passed. |
| Desktop, mobile, and extension browser checks | All 14 checks passed. |
| Email backend build and policy tests | The build passed, and all three policy tests passed. |
| Real local Firestore emulator | All eight delivery tests passed. The email transport was a test fixture. |
| Real Firebase cloud request | Failed with `403 PERMISSION_DENIED` and `AI/api-not-enabled`. The project's AI Logic service still needed activation. |
| Real on-device model availability | Chromium reported `unavailable`; Nano inference could not run on this server. |
| Actual email delivery | Not attempted. No provider account or verified sender was configured. |

## Browser behaviour

The extension captured 15 actual authored source tabs through its installed Manifest V3 reader. All 15 records persisted. Closing saved tabs closed 13 eligible tabs and preserved the pinned tab and a tab that had navigated after capture. Original-text recall worked after an offline reload. These captures were labelled **Saved excerpt**, because no successful local model run had taken place.

The reminder check used a real Chrome alarm and background worker. It saved a reminder, closed the extension panel, and confirmed that Chrome created the notification and removed the alarm. This checks Chrome's notification API; it cannot establish how every operating system presents the alert.

Desktop checks cover pasted capture, persistent notes and tags, safe rendering of saved text, favourites, archive and restore, collections, backups, import rejection, exact cloud previews, source exclusion, reading status, reminder dates, calendar export, hash navigation, browser back, and denied storage. The email preview was downloaded offline and checked for the absence of private notes and full-page text. Mobile checks cover navigation, capture, source review, settings, the model badge, Return visits, and horizontal overflow. The screenshots in `docs/images/` came from these browser checks and were visually reviewed.

The application service worker precaches the owned interface and sample pages. Offline navigation and original-text search work after installation. Download archives are excluded from the application cache. Browser notifications on the website need the page open; extension alarms need Chrome running.

## Email delivery policy

The database tests used Firestore emulator 1.22.0 and Java 21 with the `demo-tab-brain` project. They refuse to run unless the emulator address is local. No real mailbox or provider was contacted.

The tests cover concurrent workers claiming one lease, a lost provider response retrying the same frozen payload and idempotency key, deletion before transport, reminder-only messages, reminder-date deduplication, permanent failures, retry limits, an uncertain request older than twelve hours, a manual brief that preserves the schedule, and an edit during delivery that preserves the cooldown. The policy tests cover verified recipients, provider request headers, and retryable versus permanent provider errors.

The frontend and backend also check the approved bookmark data format and time zones, including daylight-saving changes. Passing these tests establishes the local scheduling and failure behaviour. A real inbox test remains part of [email setup](email-setup.md).

## Real AI setup

A real request approved four labelled sample sources and 3,364 source bytes, then reached `firebasevertexai.googleapis.com` for `gemini-3.5-flash-lite`. Firebase reported that its AI Logic API was disabled or had not been used in project `941106573002`. App Check registration and enforcement alone did not enable that service.

Chromium exposed the `LanguageModel` API, but its actual availability check returned `unavailable`. Firebase's device-model initialization also failed. No successful cloud or on-device inference is claimed here. The live badge shows these failures, and model receipts are stored only after the SDK confirms a successful response's execution location.

Unit tests that mock the Firebase SDK verify routing, source approval, failure handling, and storage. They do not establish a live model run. Follow [Firebase setup](firebase-setup.md) to activate the service and test both execution locations on a supported computer.

## Run the checks

Use Node 24 for the app:

```sh
npm ci
npm test
npm run build
npx playwright install --with-deps chromium
npm run test:e2e -- --project=desktop --project=mobile --project=extension
```

After a deployment, also run the production checks:

```sh
npm run test:e2e -- --project=live
```

The production suite checks the hosted workspace, authored source pages, both downloads and their SHA-256 checksums, offline reload, and the saved Firebase connection's approval and disconnect behaviour. It makes no generation request and sends no email.

Use Node 22 and Java 21 for the optional backend:

```sh
npm ci --prefix functions
npm --prefix functions run build
npm --prefix functions test
npx --yes firebase-tools@15.36.0 emulators:exec --only firestore --project demo-tab-brain "npm --prefix functions run test:emulator"
```

CI runs the app and email checks independently. Local connection settings, App Check development tokens, provider credentials, live tab IDs, tool caches, and test reports are excluded from the public source and relevant downloads. The supplied Firebase web identifiers and reCAPTCHA site key are intentional public client settings.
