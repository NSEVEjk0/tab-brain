# Run Tab Brain and install the extension

## Open the website

Visit https://tab-brain-memory.vercel.app. Choose **Save a page** to add your own reading, or explore the labelled example library.

The production website includes its Firebase web configuration and registered reCAPTCHA site key. In **Settings & backups**, **Verify connection** checks its Firebase App Check connection.

## Install the Chrome extension

Use desktop Chrome 139 or newer.

1. [Download the extension](https://tab-brain-memory.vercel.app/downloads/tab-brain-extension.zip) and unzip it.
2. Open `chrome://extensions` and turn on **Developer mode**.
3. Choose **Load unpacked** and select the extracted folder containing `manifest.json`.
4. Pin Tab Brain and click its icon to open the side panel.
5. Open an article or documentation page, choose **Snap all open tabs**, select the tabs, and save them.

The shortcuts are `Ctrl+Shift+Y` to open the panel and `Ctrl+Shift+S` to queue the current page for capture. Use `Command` on macOS. Confirm the capture in the panel.

The extension has its own local library. You can move pages from the website with a backup. For extension AI testing, follow [Firebase setup](firebase-setup.md) to register and enter the private App Check development token in that browser session.

## Run the source locally

Use Node 24 and Python 3.

```sh
git clone https://github.com/NSEVEjk0/tab-brain.git
cd tab-brain
npm ci
npm run dev
```

The development app opens at `http://127.0.0.1:4173`.

```sh
npm run build
npm run preview
```

The production website is built in `dist/`. The unpacked extension is in `extension-dist/`; select that folder through Chrome's **Load unpacked** action. The build also creates the source and extension ZIPs and their checksums in `dist/downloads/`.

## Connect the AI features

Follow [Firebase setup](firebase-setup.md) for the project, App Check, and local model setup. That guide explains the web and extension origins and the desktop setup for Gemini Nano.

## Run the checks

```sh
npm test
npm run build
npx playwright install --with-deps chromium
npm run test:e2e -- --project=desktop --project=mobile --project=extension
```

After deploying, run `npm run test:e2e -- --project=live`.

[Validation details](validation.md) records the checks. [Email setup](email-setup.md) covers the optional scheduled delivery backend separately.
