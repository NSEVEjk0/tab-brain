# What we checked

On November 26, the current app build passed 54 unit tests, 15 desktop, mobile, and unpacked-extension browser tests, and two public-site checks. The public site served both download bundles with matching checksums. An App Check regression test ran the Firebase SDK with simulated responses. It switched verification methods in Settings, checked that source text stayed local until approval, and verified the saved citation and brief download. All three email policy tests and eight Firestore emulator tests passed.

Google Chrome 157 ran the fixed build and generated a [new on-device Firebase AI Logic summary](evidence/nano-20261126-retest.json) without cloud configuration. It kept the original text and found it after an offline reload. The [GitHub run](https://github.com/NSEVEjk0/tab-brain/actions/runs/45808117957) recorded zero cloud generation requests.

After the fix went live, a headed Google Chrome session received HTTP 403 `App attestation failed` from Firebase App Check. The app made zero cloud generation requests. The record below includes the successful November 18 cloud run. Test public cloud access from a regular desktop browser as described in [Firebase setup](firebase-setup.md). [Hosted App Check retest](evidence/app-check-20261126.json)

Updated on November 20, 2026, using Node 24 for the app, Node 22 for the email backend, Chromium for interface checks, and official Google Chrome 158 for the current real-model probe. The public app is at https://tab-brain-memory.vercel.app. Historical service results retain their original dates below.

| Check                                         | Result                                                                                                                                                                                                                                                                          |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| App unit tests                                | 53 passed across six files, including saved-connection updates, local readiness, and connection changes during pending operations.                                                                                                                                              |
| Production build                              | TypeScript, the web build, extension, offline shell, and both download packages passed.                                                                                                                                                                                         |
| Desktop, mobile, and extension browser checks | All 14 checks passed. A separate check confirmed that unavailable local AI leaves captured text searchable after reload and never applies an AI receipt.                                                                                                                        |
| Email backend build and policy tests          | The build passed, and all three policy tests passed.                                                                                                                                                                                                                            |
| Real local Firestore emulator                 | All eight delivery tests passed again in November 20 CI. The email transport remained a test fixture.                                                                                                                                                                           |
| Real Firebase cloud request                   | On November 18, App Check verified the browser and `gemini-3.5-flash-lite` returned HTTP 200 with a cited comparison of four approved sample sources. The November 20 automated browser was rejected by App Check before any generation request.                                |
| Real on-device model inference                | Passed on November 20 in official Google Chrome 157 on the standard public GitHub runner: validated initialization, an actual saved two-sentence summary and three tags, SDK on-device receipt, original-text preservation, and offline recall. Zero cloud generation requests. |
| Actual email delivery                         | Not attempted. No provider account or verified sender was configured.                                                                                                                                                                                                           |

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

The newer Chromium test build exposed `LanguageModel`, returned `downloadable`, and completed Firebase's initialization call. Its actual prompt output explicitly said that an on-device model was unavailable in Chromium and echoed the input. That was no model inference. Initial official Google Chrome 158 profiles also reported `unavailable`. A separate profile with normal component updates enabled offered a download, but did not finish initialization within twelve minutes. No successful local summary was claimed. The server has 6 GB RAM; Google's documented CPU requirements are at least 16 GB RAM and four cores, with at least 22 GB free profile storage. A GPU path requires more than 4 GB VRAM. See [Chrome's current hardware requirements](https://developer.chrome.com/docs/ai/get-started).

The app checks a short built-in sample through the device-only Firebase model before reporting local AI ready. A JSON response constraint requests the summary structure, and the result must still contain two sentences, three tags, and an on-device inference receipt. Saving original text and offline recall continue when the model is unavailable. The device model can complete while the cloud connection changes. An approved cloud request stops if its connection is withdrawn while App Check is pending.

The November 20 reCAPTCHA script and registered site key loaded without the old invalid-key error, but App Check returned `403 PERMISSION_DENIED` and `App attestation failed`. No source text reached a generation endpoint in those attempts. That result does not establish whether a normal phone or desktop browser will be accepted; repeat **Verify connection** and an approved sample comparison there. A private registered development token is an alternative for an owner-controlled automated test. Enforcement was not disabled.

Actual Nano inference is now verified. Cloud inference has a verified historical result; current production App Check rejected both this VPS and the supported CI browser before cloud generation, so current normal-browser cloud access still needs confirmation. The live badge reports each operation's outcome, and captured-page model receipts are stored only after successful validated inference.

Unit tests that mock the Firebase SDK verify routing, source approval, failure handling, and storage. They do not establish a live model run. The cloud result above came from the real service. Follow [Firebase setup](firebase-setup.md) to test local inference on a supported computer and repeat the full workflow there.

The optional `nano-proof` job runs only when the existing GitHub workflow is dispatched manually. It uses the standard public Ubuntu runner, official Google Chrome, and an authored page. It requires a real validated Firebase device summary, its stored model receipt, and offline source recall, with zero cloud generation requests. Reports and video are retained for seven days as test evidence. The November 20 run passed on a runner reporting 16,365,628 kB total memory. Its [actual model receipt](evidence/nano-20261120.json) and [offline-recall screenshot](images/nano-proof.png) are preserved in this repository. The recording is available in the [CI run](https://github.com/NSEVEjk0/tab-brain/actions/runs/44804423213).

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
