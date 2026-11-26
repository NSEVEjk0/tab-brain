# Firebase and Chrome setup

Tab Brain uses one Firebase AI Logic model in Chrome for summaries and a second model in the cloud for comparisons. The hosted app comes with its Firebase connection. Use your own Firebase project when running cloud comparisons from another host or an unpacked extension.

## Summarize a page on this device

1. Open the website or extension in [supported desktop Chrome](https://developer.chrome.com/docs/ai/get-started). Check the [Firebase Prompt API setup](https://firebase.google.com/docs/ai-logic/hybrid/web/get-started) for the Chrome version, flags, and model download.
2. Open **Settings & backups** and select **Enable on-device AI**. The first setup can take several minutes while Chrome downloads its model.
3. Save a readable page with **Summarize with on-device AI** selected, or open an existing page and choose **Summarize locally**.
4. Open the page to see its two-sentence summary, three tags, and the **Gemini Nano · on device** receipt. Use search to find a phrase from its original text.

Local summaries use `ONLY_ON_DEVICE` and work without configuring cloud access. If Chrome cannot run the model, you can still save and search the original text. After Chrome’s initial download, test a new summary offline on the computer you plan to demonstrate.

## Compare pages with cloud Gemini

1. At [Tab Brain](https://tab-brain-memory.vercel.app/#settings), choose **Verify connection**. A successful check means Firebase App Check accepted this browser.
2. Go to **Ask my tabs** and choose **Compare my research tools** to review four fictional example sources. You can also select your own sources.
3. Choose **Approve & send to Gemini**. A working connection returns a cloud model receipt and numbered links to the sources used.

If verification fails, repeat from your regular desktop browser. The project owner can check the registered domain and score-based key in Google Cloud, then review App Check’s verification metrics and the web app’s risk threshold in Firebase. Keep App Check enabled. [Firebase’s reCAPTCHA Enterprise guide](https://firebase.google.com/docs/app-check/web/recaptcha-enterprise-provider) explains the threshold options and their effect on legitimate browsers.

## Connect your own project

1. Register a **Web app** in Firebase and copy its public Web configuration.
2. In **AI Logic → Get started**, configure the Gemini Developer API. Choose an available Gemini text model and enable AI Logic enforcement in **App Check**.
3. For a public HTTPS website, register a score-based reCAPTCHA Enterprise key for its domain. Choose **reCAPTCHA Enterprise · web** in Tab Brain and enter the site key.
4. For localhost or an unpacked extension, use **Registered development token · private test**. Register a token for your web app under **App Check → Apps → Manage debug tokens** and enter it in that browser session.
5. Save the settings. Reload after changing the verification method or development token so the SDK starts with the new setting. Then choose **Verify connection** and send one approved sample comparison.

The hosted app and extension have separate libraries and settings. You can move a library with a backup. Keep development tokens out of source, screenshots, recordings, and public judging instructions. [Firebase’s private debug provider guide](https://firebase.google.com/docs/app-check/web/debug-provider).

If the SDK shows `AI/api-not-enabled`, open **Firebase → AI Logic → Get started** for the configured project. The model endpoint is `firebasevertexai.googleapis.com`. The App Check enforcement entry is **Firebase AI Logic**.

[Verification history](validation.md) · [Firebase inference modes](https://firebase.google.com/docs/ai-logic/hybrid/web/configuration-options) · [Data and backups](privacy.md)
