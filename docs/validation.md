# What we checked

Checked on November 18, 2026, using Node 24 for the app, Node 22 for the email backend, and real Chromium for browser checks. The public app is at https://tab-brain-memory.vercel.app.

| Check | Result |
| --- | --- |
| App unit tests | 49 passed across six files, including updates to previously saved Firebase connections. |
| Production build | TypeScript, the web build, extension, offline shell, and both download packages passed. |
| Desktop, mobile, and extension browser checks | All 14 checks passed. |
| Email backend build and policy tests | The build passed, and all three policy tests passed. |
| Real local Firestore emulator | All eight delivery tests passed. The email transport was a test fixture. |
| Real Firebase cloud request | App Check verified the browser, and `gemini-3.5-flash-lite` returned HTTP 200 with a cited comparison of four approved sample sources. |
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

A successful real request approved four labelled sample sources and 3,364 source bytes, then reached `firebasevertexai.googleapis.com` for `gemini-3.5-flash-lite`. The model returned HTTP 200, and Tab Brain displayed a comparison with eleven inline source citations. The answer described the tools as fictional examples, matching the supplied sample pages. This was real cloud generation using authored fixtures.

Earlier attempts first encountered a disabled AI Logic API, then failed browser verification. A trace showed the native reCAPTCHA error, **Invalid site key or not loaded in api.js**. The owner supplied the existing key as hexadecimal text from Google Cloud Shell, which established that its last character was `8`, rather than the `S` previously copied into the app. Entering the corrected key in the real hosted interface allowed Firebase to verify the browser and the cloud comparison to succeed. The existing registration and enforcement were sufficient; no debug token was used.

The app checks App Check before invoking the cloud model, so a verification failure leaves the approved source text local. The **Verify connection** button checks browser verification separately. Unit checks cover failed verification, an unsigned placeholder token, checking the connection without either model, and the distinction between a local `LanguageModel` error and a disabled Firebase service. Two storage checks confirm that updating an old saved site key preserves pages, notes, the chosen model, reminder settings, usage counters, and custom connections.

Chromium exposed the `LanguageModel` API, but its actual availability check returned `unavailable`. Firebase's device-model initialization also failed. Cloud inference succeeded; on-device inference remains unverified. The live badge reports the result of each operation, and model receipts are stored only after the SDK confirms a successful response's execution location.

Unit tests that mock the Firebase SDK verify routing, source approval, failure handling, and storage. They do not establish a live model run. The cloud result above came from the real service. Follow [Firebase setup](firebase-setup.md) to test local inference on a supported computer and repeat the full workflow there.

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
