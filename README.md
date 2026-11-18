# Tab Brain

Tab Brain gives the pages you save somewhere useful to live. Keep the readable text, remember why you saved it, and come back when you have time.

[Open the app](https://tab-brain-memory.vercel.app) · [Browse the source](https://github.com/NSEVEjk0/tab-brain) · [Download the Chrome extension](https://tab-brain-memory.vercel.app/downloads/tab-brain-extension.zip)

[![Checks](https://github.com/NSEVEjk0/tab-brain/actions/workflows/ci.yml/badge.svg)](https://github.com/NSEVEjk0/tab-brain/actions/workflows/ci.yml)

## Why this exists

Keeping a tab open is often a way of saying, “I will need this later.” After a while, the tabs become a second to-do list. Closing them feels risky, and saving a bookmark usually keeps only the link. A week later, you remember one useful sentence but cannot remember the page title.

Tab Brain saves the readable page text and useful excerpts on your device. You can search for the detail you remember, add a note about why it mattered, and give the page a time for a return visit. When a decision needs several sources, you can choose the snippets you want Gemini to compare.

![The Tab Brain workspace, with clearly labelled authored sample pages](docs/images/workspace-desktop.png)

The website starts with 15 authored example pages so you can explore it immediately. The sample tools, features, and prices are fictional and labelled as examples. The Chrome extension starts with an empty library.

## A typical session

1. Open the extension beside the pages you are reading, then choose the tabs to save. The web companion also lets you paste a page’s text.
2. Save the readable text to your local library. On a supported computer, Gemini Nano can add a short summary and three topic tags through Firebase AI Logic.
3. Close the saved tabs when you are ready. Tab Brain checks that the save finished and leaves pinned or changed tabs open.
4. Find a forgotten detail through local search, even without an internet connection. Add your own notes, group pages into collections, and mark the ones you have read.
5. Set a reminder or add the page to your calendar. Return visits gives you a reading list and shows the pages that are due.
6. Ask a question about a few saved pages. Review their exact snippets, approve the request, and get a cloud answer with links back to the sources.

[See the application flow and architecture](docs/architecture.md).

## What Firebase does here

The AI features use the Firebase AI Logic SDK for both execution locations. Summaries use `ONLY_ON_DEVICE`. Comparisons use `ONLY_IN_CLOUD` after you approve the source preview. App Check verifies the app making the cloud request.

The model badge follows those operations. It shows Nano being prepared, a summary running on the device, sources waiting for approval, or the requested cloud model generating an answer. A saved result gets a model receipt only after the SDK confirms its inference location. A saved excerpt or an authored example has its own label.

This gives Firebase a clear job in the product: handle the two model paths while the app controls what content crosses between them. The local library works independently. The AI flow in this repository is built around Firebase’s SDK and App Check; no other model provider has been substituted.

The optional email service also uses Firebase. Authentication verifies the recipient, Firestore keeps the approved bookmark copy and schedule, and a scheduled function delivers the brief through Resend. The full library stays in the browser.

## What is working, and what still needs setup

The web companion and extension support capture, local storage, search, notes, collections, favourites, archive, reading status, reminders, calendar export, and backups. You can preview and download a reading brief without an account or an email provider.

Cloud AI has now passed a real test. On November 18, Firebase verified the browser and Gemini returned a cited comparison of four approved sample sources. The earlier verification failure came from one incorrect character in the website's public reCAPTCHA key; the app now uses the confirmed key and updates previously saved connections when you reload. This server's Chromium reported the on-device model as unavailable, so Nano still needs a real test on a supported computer. These results are recorded in [the validation notes](docs/validation.md).

Scheduled email delivery is prepared in the repository and disabled on the public deployment. It still needs a billing-enabled Firebase project, a Resend account, a verified sender, and private credential setup. A preview or a passing transport test is not evidence that an email reached an inbox.

[Finish Firebase AI setup](docs/firebase-setup.md) · [Set up scheduled email](docs/email-setup.md)

## Run the app

Use Node 24 and Python 3. Clone the repository, then run:

```sh
npm ci
npm run dev
```

The development app opens at `http://127.0.0.1:4173`. To make the production web build, extension, and downloadable source packages:

```sh
npm run build
npm run preview
```

The web build is in `dist/`, and the unpacked extension is in `extension-dist/`. On desktop Chrome 139 or newer, open `chrome://extensions`, enable Developer mode, choose **Load unpacked**, and select `extension-dist/`. Pin Tab Brain and click its icon to open the side panel.

The default shortcuts are `Ctrl+Shift+Y` to open the panel and `Ctrl+Shift+S` to queue the current page for capture. Use `Command` on macOS. Capturing still needs confirmation in the panel.

The registered website includes the public Firebase web configuration and reCAPTCHA site key. Other origins can enter their configuration in Settings. An explicit AI disconnect persists through reloads. Private extension tests need a registered App Check development token entered in that browser session.

## Reminders and reading briefs

Open a saved page to add a note, mark it as read, or set a reminder. Return visits lets you read a due page, move it to tomorrow, or export a calendar alert.

[See Return visits](docs/images/return-visits-desktop.png) · [See an email preview](docs/images/email-preview-desktop.png).

The extension can use Chrome alarms while the side panel is closed. Chrome needs to be running, and sleeping devices may delay an alert. Website notifications need Tab Brain open. Calendar export gives you an option for alerts when the page is closed.

In Settings, choose the bookmarks for your reading brief, decide whether to include summaries and reminder dates, and preview the exact copy. Full page text and private notes are excluded. Downloading the brief works offline.

When delivery is enabled, you sign in to verify the recipient and approve the preview before saving a daily or weekly schedule. The service uses that last approved copy. Preview and save again after adding pages, marking them as read, or changing reminder dates. Each email has an unsubscribe link; stopping the plan removes its approved bookmark copy and schedule from Firestore.

## Privacy and practical limits

The web companion and extension have separate local libraries. Move pages between them with a backup. Browser storage can be cleared or evicted, so export work you care about.

Captured text is limited to 36,000 readable characters per page. Local model input uses the first 18,000. Search uses keywords in titles, tags, notes, summaries, and saved text. It can find a phrase you remember, but it is not an embedding search.

Gemini Nano depends on supported desktop Chrome, suitable hardware, and a downloaded model. AI can make mistakes. Source citations help you check an answer; validating citation numbers cannot prove every claim is true or current. Captured prices may be outdated, and sample prices are fictional.

The app does not initialize analytics. Fonts and interface assets are served with the app. Firebase verification, model downloads, approved AI requests, and opted-in email delivery can use the network. The AI byte counter measures approved source payloads, including failed attempts; it is not a total network-traffic counter.

Google account passwords and service-account private keys do not belong in the app. The Firebase web identifiers and reCAPTCHA site key are public client settings. App Check development tokens and email provider keys are private. See [the privacy notes](docs/privacy.md) for the data used by each feature.

## Checks and contributions

```sh
npm test
npm run build
npx playwright install --with-deps chromium
npm run test:e2e -- --project=desktop --project=mobile --project=extension
```

Production checks use `npm run test:e2e -- --project=live`. The email backend uses Node 22; its database tests use the local Firestore emulator and Java 21. The commands and actual results are in [the validation notes](docs/validation.md).

[Contributing](CONTRIBUTING.md) explains how to make a change and check it. [The hackathon notes](docs/submission.md) list the live inference evidence and demo that still need to be completed.

Original code, sample prose, and illustrations use Apache-2.0. React, Firebase, Mozilla Readability, Lucide, and the bundled fonts retain their own licences. The font notices are included in `docs/licenses/`.
