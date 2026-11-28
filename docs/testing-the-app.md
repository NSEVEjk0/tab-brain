# Try Tab Brain

Open [Tab Brain](https://tab-brain-memory.vercel.app) in regular desktop Chrome. The hosted library and sample pages open without an account. On a phone you can use the web library, and the menu button opens navigation.

## Try both Firebase models

1. In [supported desktop Chrome](https://developer.chrome.com/docs/ai/get-started), enable **Gemma 4 for Built-in AI** in `chrome://flags/#gemma4-for-built-in-ai` and relaunch Chrome. From the library, choose **Summarize on your device → Enable on-device AI**. Let Chrome finish the first model download.
2. Open the sample **Folio: lightweight knowledge management**, then choose **Summarize locally**. Check the **Gemini Nano · on device** receipt next to the summary and three tags.
3. Disconnect from the internet or put the tab offline, then reload. Search for `full offline editing` and open the saved Folio passage.
4. Reconnect and follow the cloud comparison steps below. The completed answer has its own cloud model receipt.

## Check the cloud comparison

1. Open **Settings & backups** and tap **Verify connection**. Look for **Firebase verified this browser**.
2. Choose **Compare saved sources** from the library, or open **Ask my tabs** from the sidebar. Choose **Compare my research tools**.
3. Review the four labelled example sources. Try removing one source and watch the preview update, then include the sources you want.
4. Choose **Approve & send to Gemini**. Watch the cloud model badge and read the completed answer.
5. Follow a numbered source link, then return and download the research brief.

The example tool names, features, and prices belong to the labelled demonstration pages. You can repeat the same flow with your own saved sources.

If App Check rejects the browser, the approved excerpts stay on the device and the app reports the failure. [Latest hosted check](validation.md#november-28-release-checks)

## Save and find your own reading

1. Choose **Save a page** on the website.
2. Enter the page title, original URL, and a few paragraphs of readable text from your chosen article.
3. Choose **Save on this device**, then **Explore your memories**.
4. Search for a distinctive word from that text and open the result.
5. Add a note, edit the tags, choose **Save changes**, and mark the page as a favorite.
6. Refresh and find the page again. Check that the text, note, tags, and favorite are still present.

## Read and search offline

After the app finishes its first online load, turn off Wi-Fi and mobile data. Refresh the app and search for the same detail. Open the saved text, add a note, and refresh again. Reconnect when you want to run another cloud question or open an original source online.

## Make a return visit

Open your saved page and find **Come back to this page**. Set a reminder a few minutes ahead and look for it in **Return visits**. When it becomes due, try moving it to tomorrow or marking the page as read. **Add to calendar** downloads a calendar event for your chosen reminder.

The website checks reminders while it is open. The extension uses Chrome alarms while Chrome is running. You can enable notifications from Return visits or import the downloaded event into your calendar.

## Organize and carry your library

Create a collection and add a saved page. Switch between grid, list, and topics, then select a tag to find its pages. Archive the page, find it in Archive, and restore it.

In Settings, export a backup and inspect the saved file. Importing the backup into another browser carries over the saved pages, notes, collections, and reminders.

You can also choose bookmarks for a reading brief, preview its exact copy, and download it. The copy contains your selected titles, URLs, optional summaries, and reminder dates.

## Capture actual Chrome tabs

[Install the extension](get-started.md#install-the-chrome-extension), open two articles, and open Tab Brain's side panel. Choose **Snap all open tabs**, select the two pages, and save them. Read the save receipt, then choose **Close saved tabs**. Search for a detail from the captured reading in the extension library.

[Firebase setup](firebase-setup.md) covers desktop model support and the extension's optional cloud connection.
