# Connect a real Firebase project

The registered production website includes the supplied public configuration for project `tab-brain` and its reCAPTCHA Enterprise site key. It makes that connection available automatically on `https://tab-brain-memory.vercel.app`; saved custom connections and explicit disconnects take precedence. The owner completed App Check setup in Google Cloud Shell, keeping Google credentials off the build server.

A real cloud test on November 18 reached Firebase and returned `403 PERMISSION_DENIED` with the SDK error `AI/api-not-enabled`. The response identified `firebasevertexai.googleapis.com` as disabled in project `941106573002`. Open [AI Logic for Tab Brain](https://console.firebase.google.com/project/tab-brain/ailogic/), choose **Get started**, and complete the **Gemini Developer API** setup. Then allow the service activation to finish and repeat the approved request in the app. Creating a reCAPTCHA key and enforcing App Check do not enable the model service.

The AI request gateway is `firebasevertexai.googleapis.com`. Firebase uses `firebaseml.googleapis.com` as the AI Logic App Check enforcement identifier. The different names refer to different setup steps. A public web API key cannot enable either service or change project permissions.

This server's Chromium reported its on-device model as `unavailable`, so it could not generate a Nano summary. A supported desktop computer still needs to complete the local test. Both failures leave the saved library available.

For the extension, a different host, or another Firebase project, follow the setup below. The extension prefills the public Web configuration, but its private App Check development token must be registered and entered by the owner.

1. Open your Firebase project and register a **Web app**. Copy its JSON configuration (`apiKey`, `projectId`, `appId`, and the other optional Web configuration fields).
2. Open **AI Services → AI Logic**. Complete the Gemini Developer API setup and enable the required services. The text workflow can use the free tier within its limits.
3. Enable App Check enforcement for Firebase AI Logic.
4. In Tab Brain's **Settings & backups**, paste the Web app configuration and select an App Check verification mode.
5. For the hosted web companion, register reCAPTCHA Enterprise for its domain and supply the site key. For a private extension development/judging session, privately register an App Check development token for that Web app in Firebase and enter it in the password field. The token is kept for the browser session and is never packaged or exported.
6. Save the configuration. Configuration saved means the settings were stored; it does not claim a successful live model call. Reload the page after changing App Check verification mode or its development token so the SDK starts with the new verification state.
7. On compatible desktop Chrome, follow the official on-device setup, including any required Prompt API flag and model download. Click **Enable on-device AI** so model initialization receives user activation. A model initialization failure leaves normal capture and recall available.
8. Capture a readable page with the on-device summary option enabled. Watch the badge show **Gemini Nano** while it works. A successful capture has two summary sentences, three tags, and a saved model receipt identifying on-device execution. The SDK's actual inference source is checked before that receipt is stored. A **Saved excerpt** label means the text was saved without a verified model summary.
9. Disconnect the network and confirm source recall still works. Once the local model has downloaded, also verify local summarization offline on the target device.
10. Reconnect, choose **Ask my tabs**, enter a source question, inspect the exact snippets, and click **Approve & send to Gemini**. The badge should name the requested cloud model while it works. A successful answer must identify cloud execution and include valid source-number citations. Check App Check enforcement and Firebase usage in the console.

The hosted build and the extension have different origins. Configure the extension separately and move source records with a backup if needed. Keep App Check development tokens, Google access tokens, and service-account private keys out of public source, screenshots, test instructions, and video. Firebase Web configuration and reCAPTCHA Enterprise site keys are public client identifiers. A configured interface still needs actual local and cloud model verification.

Official references:

- https://firebase.google.com/docs/ai-logic/hybrid/web/get-started
- https://firebase.google.com/docs/ai-logic/hybrid/web/configuration-options
- https://firebase.google.com/docs/app-check/web/debug-provider
- https://firebase.google.com/docs/app-check/web/recaptcha-enterprise-provider
- https://developer.chrome.com/docs/ai/get-started
