# Connect a real Firebase project

The registered production website includes the supplied public configuration for project `tab-brain` and its reCAPTCHA Enterprise site key. It makes that connection available automatically on `https://tab-brain-memory.vercel.app`; saved custom connections and explicit disconnects take precedence. The owner completed App Check setup in Google Cloud Shell, keeping Google credentials off the build server.

A real test on November 18 verified the browser through App Check and received a successful, cited Gemini answer. The earlier `appCheck/recaptcha-error` came from an incorrectly transcribed public site key: the actual key ends in `IU8`, while the app had used `IUS`. Google Cloud Shell's hexadecimal output confirmed the exact characters. The corrected key worked with the existing Firebase registration and enforcement. The app also updates saved connections that contain that old key when the registered website reloads.

The app now checks App Check explicitly before a model request. In the deployed website's **Settings & backups**, choose **Verify connection**. A successful check establishes browser verification; an approved source question still needs to establish actual Gemini inference. The Firebase console's **Add the SDK** hint is general setup guidance. Tab Brain already imports and uses the Firebase AI Logic SDK.

If verification fails in a normal browser, check the website key in [Google Cloud reCAPTCHA](https://console.cloud.google.com/security/recaptcha?project=tab-brain). Its allowed domain must include `tab-brain-memory.vercel.app`, and Firebase's App Check registration for the web app must use the same Enterprise site key shown in Tab Brain Settings. Automated or extension development tests can use an owner-registered private App Check development token. Enter it in that browser session or a private terminal; it does not belong in chat or public source.

The initial test had returned `403 PERMISSION_DENIED` and `AI/api-not-enabled`, identifying `firebasevertexai.googleapis.com` as disabled in project `941106573002`. For a project that still returns that error, open **AI Logic → Get started** and complete the **Gemini Developer API** setup. Creating a reCAPTCHA key and enforcing App Check do not enable the model service.

The AI request gateway is `firebasevertexai.googleapis.com`. Firebase uses `firebaseml.googleapis.com` as the AI Logic App Check enforcement identifier. The different names refer to different setup steps. A public web API key cannot enable either service or change project permissions.

The November 20 test found that a newer Chromium build exposes a placeholder `LanguageModel` API that echoes input instead of running Nano. Initial official Google Chrome 158 profiles reported `unavailable` on this 6 GB VPS. With normal component updates enabled, Chrome offered a download but did not complete initialization within twelve minutes. Google's current CPU requirements are at least 16 GB RAM and four cores; the profile volume also needs at least 22 GB free space. See [the supported hardware requirements](https://developer.chrome.com/docs/ai/get-started). The optional manually dispatched CI job provides another supported-hardware test route. A successful real local summary is still required; the app verifies a built-in device-only sample before reporting the model ready.

The current automated cloud check also returned an App Check attestation failure before any model request. The corrected site key loaded without its previous invalid-key error. Repeat browser verification and an approved comparison on the actual judging browser; if it fails there too, check the registration and allowed domain in the console. The earlier November 18 cloud result remains valid historical evidence.

For the extension, a different host, or another Firebase project, follow the setup below. The extension prefills the public Web configuration, but its private App Check development token must be registered and entered by the owner.

1. Open your Firebase project and register a **Web app**. Copy its JSON configuration (`apiKey`, `projectId`, `appId`, and the other optional Web configuration fields).
2. Open **AI Services → AI Logic**. Complete the Gemini Developer API setup and enable the required services. The text workflow can use the free tier within its limits.
3. Enable App Check enforcement for Firebase AI Logic.
4. In Tab Brain's **Settings & backups**, paste the Web app configuration and select an App Check verification mode.
5. For the hosted web companion, register reCAPTCHA Enterprise for its domain and supply the site key. For a private extension development/judging session, privately register an App Check development token for that Web app in Firebase and enter it in the password field. The token is kept for the browser session and is never packaged or exported.
6. Save the configuration, then choose **Verify connection**. Configuration saved means the settings were stored; verification checks App Check, and neither claims a successful live model call. Reload the page after changing App Check verification mode or its development token so the SDK starts with the new verification state.
7. On compatible desktop Chrome, follow the official on-device setup, including any required Prompt API flag and model download. Click **Enable on-device AI** so model initialization receives user activation. A model initialization failure leaves normal capture and recall available.
8. Capture a readable page with the on-device summary option enabled. Watch the badge show **Gemini Nano** while it works. A successful capture has two summary sentences, three tags, and a saved model receipt identifying on-device execution. The SDK's actual inference source is checked before that receipt is stored. A **Saved excerpt** label means the text was saved without a verified model summary.
9. Disconnect the network and confirm source recall still works. Once the local model has downloaded, also verify local summarization offline on the target device.
10. Reconnect, choose **Ask my tabs**, enter a source question, inspect the exact snippets, and click **Approve & send to Gemini**. The badge should name the requested cloud model while it works. A successful answer must identify cloud execution and include valid source-number citations. Check App Check enforcement and Firebase usage in the console.

The hosted build and the extension have different origins. Configure the extension separately and move source records with a backup if needed. Keep App Check development tokens, Google access tokens, and service-account private keys out of public source, screenshots, test instructions, and video. Firebase Web configuration and reCAPTCHA Enterprise site keys are public client identifiers. Cloud inference has been verified on the hosted website; actual local inference still needs a supported computer.

Official references:

- https://firebase.google.com/docs/ai-logic/hybrid/web/get-started
- https://firebase.google.com/docs/ai-logic/hybrid/web/configuration-options
- https://firebase.google.com/docs/app-check/web/debug-provider
- https://firebase.google.com/docs/app-check/web/recaptcha-enterprise-provider
- https://developer.chrome.com/docs/ai/get-started
