# Firebase #BuildHybridAI submission notes

The intended demonstration is a research session with 15 mixed tabs: capture them locally, produce two-sentence summaries and three tags, save the records, close the saved tabs, recall a forgotten detail offline, and compare a few approved sources using cloud Gemini.

The interface, local storage, extraction, offline recall, notes, reminders, source preview, model badge, and distribution are implemented and tested. The [public repository](https://github.com/NSEVEjk0/tab-brain) contains the Apache-2.0 license, setup instructions, and automated checks. The optional email service is prepared but disabled until a provider and Firebase backend are configured.

A real cloud request on November 18 passed App Check and returned a cited Gemini comparison of four approved sample sources. Correcting one character in the public reCAPTCHA key resolved that earlier verification failure. The November 20 automated browser was rejected by App Check before generation, so repeat the cloud check on the judging browser. On this 6 GB VPS, initial Chrome profiles reported Nano unavailable; a profile with component updates enabled offered a download but did not finish initialization. A Chromium API that only echoes input is not local inference. The standard public CI runner completed real Nano generation, stored its SDK-confirmed receipt, and recalled the original source offline. That proof and recording are preserved in [the verification record](validation.md). The final video still needs to demonstrate the approved cloud comparison in the same working flow; current automated production attestation remains blocked.

The rules audit from November 17 records a deadline of **November 30, 2026, at 22:00 UTC**. The official FAQ requires both local and cloud inference through Firebase AI Logic, and App Check is required. A Chrome extension is eligible; a working single platform is sufficient. The public source needs an open-source license, runtime Firebase calls, and setup instructions. The demo video must be public on YouTube and no longer than three minutes. Judging access must stay free through December 16.

Before submitting:

- Use the verified Nano receipt and recording as local-inference evidence. Repeat the cloud comparison on a browser accepted by production App Check and record both execution locations in the final workflow.
- Check that the public repository and free judging app remain accessible. The extension and complete source can also be downloaded from the app.
- Record a real capture → declutter → offline recall → approved cloud comparison using owned or authorized source pages. Clearly identify any sample fixtures.
- Record and upload a public English demo video of at most three minutes; do not show secrets or private data.
- Complete the Devpost submission yourself, confirm personal/team eligibility, and keep the judging project available. No submission or external message is sent automatically.

Suggested 2:45 video sequence: 0:00–0:25 cluttered research session and the forgotten-detail problem; 0:25–1:10 real local capture and safely closing saved tabs; 1:10–1:35 offline recall; 1:35–2:25 exact preview and a real cited Firebase cloud comparison; 2:25–2:45 architecture, privacy boundaries, and the use case.

Sources: https://firebasehybridaihackathon.devpost.com/rules and https://firebasehybridaihackathon.devpost.com/details/faqs.
