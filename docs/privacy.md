# Your data in Tab Brain

Saving a page, searching for a detail, adding a note, and setting a local reminder all use browser storage. These features work without sending the library to a server.

| Data | Where it goes | What starts the transfer |
| --- | --- | --- |
| Captured text, tags, notes, collections, reading status, and local reminders | IndexedDB on the current browser origin. | You save or edit a page. |
| Page text used for an on-device summary | Chrome’s device model through Firebase AI Logic. | You enable local AI and request a summary. |
| AI question and selected source snippets | Firebase AI Logic and the configured cloud model. | You approve the exact source preview. |
| Titles, URLs, optional short summaries, and optional email reminder dates | Firestore and the email provider. | You verify the recipient and approve an email plan. |
| Google sign-in profile and verified recipient identity | Firebase Authentication. | You connect email delivery. |
| Local notification title and page title | The browser’s notification system. | You enable notifications and a saved reminder becomes due. |
| Calendar event | The downloaded file and the calendar app you import it into. | You choose Add to calendar. |

## AI requests

A cloud preview contains the question and each approved source’s title, URL, capture time, short summary, and up to three relevant excerpts. Full saved text and personal notes are excluded. A note can help local search find a page without becoming part of that page’s cloud payload.

The byte counter records approved AI source payloads, including attempts that fail. It does not include model downloads, app downloads, Firebase verification traffic, email copies, or opening an original link.

## Email plans

Email delivery is optional. Previewing and downloading a brief works without signing in. Live delivery needs a verified account and a checked approval box. The server uses the address verified by Firebase Authentication; it does not accept a client-selected recipient.

The plan contains the last bookmark copy you approved. Local edits do not automatically replace that server copy. Review and save the plan again when the list, reading status, or reminder dates change.

Stop emails removes the approved bookmark copy and delivery schedule from Firestore. Every delivered email also includes an unsubscribe link. A delivery already in flight may still arrive. Removing the plan does not delete the local library or the Firebase sign-in account.

Delivery code avoids logging recipient addresses, bookmark contents, provider secrets, or sign-in tokens. The provider and Firebase still process the data necessary for the opted-in feature under their own service policies.

## Credentials and backups

The Firebase web configuration and reCAPTCHA site key are public identifiers. They are included in the source. They do not grant permission to change the Firebase project.

App Check development tokens belong in the private browser session. Email provider credentials belong in Firebase Secret Manager. Google passwords, service-account private keys, and provider secrets are excluded from the application, repository, and downloadable packages.

Backups contain saved pages, personal notes, reading status, reminders, tags, and collections. They exclude connection settings, development tokens, and live Chrome tab identities. A backup can contain private reading material, so keep the downloaded file somewhere you trust.

The application does not initialize analytics. Fonts and interface assets are bundled locally. Opening a source link, connecting Firebase, downloading a model, and approving cloud features can use the network.
