# Turn on scheduled reading briefs

The app can already preview and download a bookmark brief. Scheduled delivery needs an email provider and a durable place to keep the approved copy while the browser is closed. This repository uses Resend, Firestore, and scheduled Firebase functions for that job.

Delivery is disabled on the public deployment until this setup is complete. No email provider account or sender credentials were available during the November 18 update.

## What the project owner needs

Create a [Resend account](https://resend.com/signup) and configure a verified sender. Resend’s testing sender can send to the account owner’s verified address; sending to other users needs a verified sending domain. Create an API key with sending access and keep it private.

The Firebase project needs the Blaze plan for scheduled Cloud Functions. Review billing in the Firebase console before enabling that part. This change does not activate billing or purchase a provider plan for you.

In Firebase Authentication, enable the Google sign-in provider and add `tab-brain-memory.vercel.app` to the authorized domains. The app uses sign-in to verify the delivery address. It does not ask for the owner’s Google password.

Create the default Firestore database for the project. This code uses the `emailPlans` collection. Review the rules before deploying if the project already contains other applications: the supplied rules deny direct client database access and are written for this app’s server-managed email plans.

## Deploy the backend privately

Use Node 22 and authenticate the Firebase CLI in your own terminal. On a remote terminal, the login command can use `--no-localhost`. Complete authentication there rather than pasting login codes into chat.

```sh
npx --yes firebase-tools@15.36.0 login --no-localhost
npm ci --prefix functions
```

Copy `functions/.env.example` to `functions/.env.tab-brain`, then replace `EMAIL_FROM` with the sender verified by your provider. Keep `PUBLIC_APP_URL` set to the deployed website. Environment files with actual values are ignored by Git and excluded from source packages.

Store the sending key in Firebase Secret Manager through the CLI prompt:

```sh
npx --yes firebase-tools@15.36.0 functions:secrets:set RESEND_API_KEY --project tab-brain
```

Build and check the functions, then deploy the reviewed rules, indexes, and functions:

```sh
npm --prefix functions run build
npm --prefix functions test
npx --yes firebase-tools@15.36.0 deploy --only firestore,functions:tab-brain-email --project tab-brain
```

The functions run in `us-central1`. They use Firebase’s runtime credentials, so a downloaded service-account private key is not needed. `RESEND_API_KEY` is bound only to the sending functions. The callable functions enforce App Check; keep the website’s reCAPTCHA registration working.

After deployment, set `VITE_EMAIL_SERVICE_ENABLED=true` in the web app’s build environment and deploy a new web build. This flag is a public feature switch, not a place for provider secrets.

## Try one approved brief

Open Settings in the web companion and connect email delivery with Google. Save one of your own bookmarks, choose its short summary or just its title and link, and open the preview. Check the approval box and turn on the schedule.

Use **Send one now** to ask the provider to deliver that approved copy to the verified account. The app reports when the provider accepts it; check the inbox and spam folder separately. Then test the scheduled run, a due bookmark reminder, and the unsubscribe link with your own account.

These manual checks are still required. A mocked provider response and an emulator test cannot establish delivery to a real inbox.

## What a schedule means

The schedule uses the last list you approved. Additions, reading-status changes, and new reminder dates stay local until you preview and save a new copy. Each plan can include up to 100 bookmarks and summaries of up to 320 characters.

The scheduler checks every 15 minutes, so a due email can arrive after its chosen time. A saved plan waits at least an hour before starting a different email, including after an edit during delivery. Daily and weekly times follow the selected time zone, including clock changes. Provider failures retry the same immutable message with the same idempotency key. Repeated or permanent failures pause the plan instead of keeping it in a retry loop.

The server derives the recipient from a verified Firebase identity and checks that account before sending. Full page text and personal notes are rejected from the email data format. Stop emails or a confirmed unsubscribe removes the approved server copy and schedule. An already dispatched request may still arrive.

## Test without sending email

Use Node 22 and Java 21. The emulator command names a demo project and the tests refuse to run without a local emulator address.

```sh
npm ci --prefix functions
npm --prefix functions run build
npm --prefix functions test
npx --yes firebase-tools@15.36.0 emulators:exec --only firestore --project demo-tab-brain "npm --prefix functions run test:emulator"
```

The tests use real local Firestore transactions and a fake email transport. They cover concurrent workers, lost responses, frozen retries, removal before delivery, reminder dates, permanent errors, retry limits, and the hourly limit.

Official references: [Firebase scheduled functions](https://firebase.google.com/docs/functions/schedule-functions), [function secrets](https://firebase.google.com/docs/functions/config-env), [App Check for callable functions](https://firebase.google.com/docs/app-check/cloud-functions), [Google sign-in](https://firebase.google.com/docs/auth/web/google-signin), [Resend’s send API](https://resend.com/docs/api-reference/emails/send-email), and [Resend idempotency keys](https://resend.com/docs/dashboard/emails/idempotency-keys).
