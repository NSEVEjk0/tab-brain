# Tab Brain for Firebase #BuildHybridAI 2026

- **Platform** Web / Chrome
- **Submit by** November 30, 2026 at 22:00 UTC
- **Keep judging access available through** December 16, 2026 at 22:00 UTC

[Devpost rules](https://firebasehybridaihackathon.devpost.com/rules) · [Organizer FAQ](https://firebasehybridaihackathon.devpost.com/details/faqs) · [Firebase resources](https://firebasehybridaihackathon.devpost.com/resources)

## Project

Tab Brain is for people who research in Chrome and end up keeping tabs open for a detail they might need later. Save the readable text and original links, close the saved tabs, then search for a phrase or reopen a passage while offline.

For summaries and tags, Tab Brain uses Firebase AI Logic with Gemini Nano and device-only inference. For comparisons, it uses a cloud Gemini model through the same SDK. The reader selects the excerpts, sees what will go to Gemini, and approves the request. Firebase App Check verifies the browser. Each answer links back to its sources, and notes stay on the reader’s device.

During the submission period, the project added the Chrome side panel, local library, safe tab capture and close, offline recall, both Firebase AI Logic paths, source approval, cited brief exports, and reminders. The first public commit was November 18. Identify any pre-existing code in the Devpost description if applicable. [Repository history](https://github.com/NSEVEjk0/tab-brain/commits/main/)

## Entry materials

| Devpost field | Material |
| --- | --- |
| Public code | [Apache-2.0 GitHub repository](https://github.com/NSEVEjk0/tab-brain) |
| Live app | [Tab Brain on the web](https://tab-brain-memory.vercel.app) |
| Chrome extension | [Download ZIP](https://tab-brain-memory.vercel.app/downloads/tab-brain-extension.zip) · [Install instructions](get-started.md#install-the-chrome-extension) |
| Testing instructions | [Try Tab Brain](testing-the-app.md) · [Current verification](validation.md#november-28-release-checks) |
| Images | [Desktop library](images/workspace-desktop.png) · [Mobile library](images/workspace-mobile.png) |
| Demo video | [Video and upload files](https://tab-brain-demo-review.vercel.app/). The Devpost entry needs the public YouTube URL. |

Firebase asks for a practical use of both inference modes and explicitly allows choosing a mode per feature. The four equally weighted judging criteria are technical implementation, design, impact, and quality of the idea. Firebase’s build-session advice is to show the audience, problem, and working hybrid features in the first 30 seconds. [Organizer FAQ](https://firebasehybridaihackathon.devpost.com/details/faqs) · [Judging criteria](https://firebasehybridaihackathon.devpost.com/rules)

## Finish on Devpost

1. Confirm the hosted AI comparison in regular desktop Chrome. A successful answer needs linked citations and a **cloud** model receipt. The latest App Check result is in the verification record.
2. Publish the English demo on YouTube as **Public**. Keep it within three minutes, open the video while signed out, and add the YouTube URL to the entry.
3. Select **Web / Chrome**, add any team members, and enter the public source, hosted app, and testing guide. Submit the entry in Devpost and keep free testing access available throughout judging.
