# Contributing to Tab Brain

A good change makes it easier to save something useful, find it again, or make time to read it. Describe the problem you noticed and the resulting behaviour so another person can review the change without knowing its history.

Use Node 24 for the web app and Node 22 for the optional email backend. Install from the checked-in lockfiles. Run the checks for the part you changed; the commands are in [the validation notes](docs/validation.md).

The TypeScript, JavaScript, and CSS use Prettier 3.6.2's default formatting. You can format an edited file with `npx --yes prettier@3.6.2 --write path/to/file`.

Keep page text and personal notes local unless the user has approved the relevant cloud copy. Give saved excerpts, authored examples, imported summaries, and verified AI results their correct labels. A failing model call should leave the saved text available and show a useful error.

When a change affects notifications or delivery, check failure and retry behaviour as well as the successful path. Use the `demo-tab-brain` Firestore emulator for database tests. Test fixtures and inbox addresses in automated tests are fictional; the tests do not send real mail.

Update the README or setup guide when the steps a person needs to follow have changed. Include screenshots when an interface change needs visual review, and use owned example content rather than someone’s private browsing data.
