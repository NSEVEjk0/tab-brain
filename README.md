# Tab Brain

Keep the useful part of a page close, even after you close the tab.

Tab Brain saves readable page text, your notes, and the source link in one searchable library. Use it to keep track of research, make time for articles you want to read, and compare the sources behind a decision.

[Open Tab Brain](https://tab-brain-memory.vercel.app) · [Download the Chrome extension](https://tab-brain-memory.vercel.app/downloads/tab-brain-extension.zip) · [Browse the source](https://github.com/NSEVEjk0/tab-brain)

[![Checks](https://github.com/NSEVEjk0/tab-brain/actions/workflows/ci.yml/badge.svg)](https://github.com/NSEVEjk0/tab-brain/actions/workflows/ci.yml)

![The Tab Brain workspace](docs/images/workspace-desktop.png)

## Why Tab Brain is useful

You open a few pages to answer a question. One has a useful explanation, another has the price you need, and a third is something you want to read properly later. Before long, you have a row of tabs that you are reluctant to close.

Tab Brain gives that reading a home. Save the text, add a note about why it matters, and close the saved tabs when you are ready. When you return, search for the words you remember, open the original source, or bring a few pages together for a comparison.

The useful detail stays with its context: the source, the capture date, your notes, and the time you want to revisit it.

## What you get

- **Read in dark or light.** Use the sun/moon button in the top bar to switch the whole workspace, including saved text and dialogs. Dark is the default, and this browser remembers your choice.
- **Save the text you want to return to.** The Chrome extension captures readable pages from the tabs you choose. On the website, **Save a page** lets you paste the title, link, and text.
- **Find a page by its useful detail.** Search across titles, saved text, excerpts, tags, and your own notes. You can look for a remembered phrase without first remembering the page's title.
- **Keep your reading available offline.** Your saved library lives on your device. Read captured text, search, edit notes, and organize pages while you are offline.
- **Keep the reason beside the source.** Add a personal note, put a page into a collection, mark a favorite, or archive finished work. Grid, list, and topic views give you different ways to browse the same library.
- **Close saved tabs with confidence.** The extension confirms that the pages were saved before offering to close them. It preserves pinned tabs and tabs that have changed since capture.
- **Come back at a useful time.** Set a reminder, see due pages in **Return visits**, move a reminder to tomorrow, or add it to your calendar. Marking a page as read keeps the reading list current.
- **Compare the pages behind a decision.** Choose saved sources, review their exact snippets, and approve a question for Gemini. The answer includes numbered source links and a section for missing information.
- **Stay in control of what you send.** You can remove a source from the preview before approving a cloud question. Personal notes remain in your local library, outside the source snippets sent for comparison.
- **Take the result with you.** Download a research answer with its sources, preview and download a compact reading brief, or export a backup of your saved pages and notes.

[Explore the features](docs/features.md) · [See practical use cases](docs/use-cases.md)

## Where it fits into your day

**Research and studying.** Keep articles for an essay or project in a collection. Add the point each page supports, then find the relevant passage and source when you return to your writing.

**Learning and building.** Save the documentation, tutorial, or explanation that helped you solve a problem. Add your own setup notes so you can find the same detail when you need it again.

**Choosing a product or service.** Keep the pages you are comparing together, then ask about their captured features, prices, or trade-offs. The numbered source links let you go back to the pages behind the answer.

**Preparing for a meeting.** Collect the background reading, add your questions, and download a brief from selected sources. Your notes and reading stay together between sessions.

**Making time to read.** Give an interesting page a reminder instead of leaving it open indefinitely. Return visits puts due pages and unread reading within reach.

**Reading away from a connection.** Save material before a journey or a day away from reliable internet, then use its captured text and your notes offline.

## A session from start to finish

1. Open Tab Brain beside your reading in the Chrome extension, or choose **Save a page** on the website.
2. Save the pages you want to keep, and add them to a collection if they belong to the same question or project.
3. Add a note about the detail that matters. Close the saved tabs from the extension when you are ready.
4. Return later and search for a word or phrase from the page. Open its saved text or follow the source link.
5. Set a return visit for unfinished reading, or mark the page as read when you have finished.
6. For a comparison, open **Ask my tabs**, review the selected snippets, and choose **Approve & send to Gemini**.

The website includes 15 labelled example pages so you can explore this flow immediately. You can also start by saving your own reading.

[Try the app step by step](docs/testing-the-app.md)

## Firebase and your source choices

Tab Brain uses Firebase AI Logic for its AI calls and Firebase App Check to verify the app making a cloud request. You choose the saved sources and review the snippets before a comparison is sent.

The model badge shows which model is working. Completed answers keep the model name and where it ran with the result. Source links and capture dates stay with the answer, so you can return to the material behind it.

[Read how the app works](docs/architecture.md) · [Firebase setup](docs/firebase-setup.md)

## Your library, ready to move

Export your saved pages, notes, tags, collections, reading status, and reminders as a backup. Import it into another browser to carry your reading with you.

The app serves its interface assets and fonts locally and keeps personal notes on your device. Each cloud question has its own source preview for you to approve.

[Read about your data](docs/privacy.md)

## Build and contribute

[Development and extension installation](docs/get-started.md) explains how to run the website locally, build the extension, and load it in Chrome.

The project includes automated checks for capture, storage, offline recall, notes, organization, reminders, source approval, and distribution.

```sh
npm test
npm run build
npm run test:e2e -- --project=desktop --project=mobile --project=extension
```

[Validation details](docs/validation.md) · [Contributing](CONTRIBUTING.md) · [Hackathon notes](docs/submission.md)

Original code, sample prose, and illustrations use Apache-2.0. Dependencies and bundled fonts retain their own licences; the notices are included in the source.
