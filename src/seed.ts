import type { Collection, Cover, Memory, MemoryKind } from "./types";
import { publicSite } from "./constants";

export const sampleCollections: Collection[] = [
  { id: "research", name: "Product research", color: "#c8b5eb" },
  { id: "building", name: "Things I’m building", color: "#a5c9dd" },
  { id: "inspiration", name: "A little inspiration", color: "#e6bc91" },
];

interface Sample {
  slug: string;
  title: string;
  summary: string;
  tags: string[];
  kind: MemoryKind;
  cover: Cover;
  color: string;
  collection: string;
  text: string;
}
export const samplePages: Sample[] = [
  {
    slug: "a-quieter-web",
    title: "Designing for a quieter web",
    tags: ["design", "focus", "digital-wellbeing"],
    kind: "article",
    cover: "orbit",
    color: "mint",
    collection: "inspiration",
    summary:
      "Good interfaces leave room to think. A few small choices can make the web feel less demanding and more like a place you want to spend time.",
    text: "Designing for a quieter web\n\nAn original Tab Brain field note, written for this sample workspace.\n\nA calm interface helps you make one useful decision at a time. It uses a clear reading order, familiar controls, and generous space around the thing that matters. A notification should earn its place rather than compete with every other element.\n\nStart by removing interruptions from the core task. Keep progress visible, make unfinished work recoverable, and tell people what happened in plain language. Motion can explain a transition, but a reduced-motion setting should preserve the same information.\n\nIn a research workspace, that means saving a page without losing your place. The receipt matters: show the source, the capture time, and where it was stored. A quiet design still has personality. It simply gives that personality room to breathe.\n\nTry one change: replace a row of competing buttons with one clear next action and a small, predictable menu for the rest.",
  },
  {
    slug: "local-first-field-guide",
    title: "A field guide to local-first software",
    tags: ["local-first", "offline", "privacy"],
    kind: "guide",
    cover: "layers",
    color: "lavender",
    collection: "building",
    summary:
      "Your work should be useful before a server is involved. Start with a durable local copy, then make sharing a deliberate step.",
    text: "A field guide to local-first software\n\nAn original sample guide.\n\nLocal-first software gives the person using it a useful copy of their work on their own device. Opening, editing, and searching that copy should not require a working network connection. Cloud services can add collaboration or computation without becoming a prerequisite for reading your own notes.\n\nIndexedDB is a practical browser database for structured page records. Save a record inside a transaction, then wait for the transaction to complete before announcing success. A successful request callback alone is not a receipt for the entire transaction.\n\nOffline support has two halves: local data and an available application shell. A service worker can cache the interface assets after the first online visit. Browser storage can still be cleared or evicted, so a portable backup remains useful.\n\nKeep sensitive captures on the device. If cloud synthesis is useful, select small excerpts, show the exact payload, and ask the user to approve that specific request. Local-first is an ownership choice, not a promise that a device will never communicate with a network.",
  },
  {
    slug: "react-patterns",
    title: "React patterns worth keeping",
    tags: ["react", "frontend", "patterns"],
    kind: "documentation",
    cover: "code",
    color: "sky",
    collection: "building",
    summary:
      "Keep derived state derived, put durable work behind a small data layer, and make effects easy to cancel. Simple boundaries make an interface easier to trust.",
    text: "React patterns worth keeping\n\nOriginal sample developer notes.\n\nWhen a filtered list can be calculated from a query and a library, calculate it during rendering instead of storing a second copy of the list. A memo can help with an expensive calculation, but correctness should not depend on the cache.\n\nA durable data layer owns database transactions. The interface calls save, awaits completion, and then refreshes its snapshot. This keeps optimistic presentation from claiming that work is safely stored before it is.\n\nEffects should synchronize with an external system. Attach a listener in an effect and remove it during cleanup. Guard an incoming command with a unique request ID so a remount cannot process it twice.\n\nFor an accessible modal, move focus inside when it opens, trap Tab within the dialog, close with Escape when safe, and restore focus to the initiating control. A loading state must name the operation and remain understandable without animation.",
  },
  {
    slug: "orbit-research",
    title: "Orbit: a focused research workspace",
    tags: ["research", "tools", "pricing"],
    kind: "tool",
    cover: "window",
    color: "peach",
    collection: "research",
    summary:
      "Orbit brings saved sources and a compact writing space together. Its sample plan suits individual researchers who want a simple place to turn reading into a brief.",
    text: "Orbit — fictional product for the Tab Brain demo\n\nThese product details and prices are synthetic examples, not offers from a real company.\n\nOrbit is an example research workspace with folders, saved sources, a distraction-free writing editor, and Markdown export. The fictional Individual plan costs $9 per month when billed monthly. A free example plan allows 50 saved sources.\n\nIts strengths are a compact writing interface, straightforward source organization, and portable Markdown exports. Its limitations in this example are that collaborative editing is unavailable and offline access is read-only after a source has been cached.\n\nFor a consultant preparing an individual client brief, Orbit is the simplest example option. Teams that need shared editing should compare Relay. Visual thinkers should compare Canvas. Every price in this note belongs only to the synthetic demo and has no real-world purchasing meaning.",
  },
  {
    slug: "digital-gardening",
    title: "The small art of digital gardening",
    tags: ["notes", "creativity", "knowledge"],
    kind: "article",
    cover: "garden",
    color: "sand",
    collection: "inspiration",
    summary:
      "A useful note collection grows through small connections, not perfect categories. Leave enough context for your future self to remember why a page mattered.",
    text: "The small art of digital gardening\n\nAn original sample essay.\n\nA collection becomes useful when notes can find one another. A saved source needs its title, a link, a short description, and the detail that made you pause. Tags are paths through that collection rather than a perfect taxonomy.\n\nStart with three durable topics instead of twenty clever labels. Let a topic earn another branch when several sources need it. A source can belong to more than one collection; your future question may cross the categories you chose today.\n\nWhen revisiting a note, add the reason it matters now. Keep the original source and capture date visible, especially for claims that change over time. Pricing, product features, and deadlines should never be treated as permanent facts.\n\nA garden grows because you return to it. Search should be forgiving, favorites easy to reach, and old work simple to reopen.",
  },
  {
    slug: "browser-workspace",
    title: "When your browser becomes a workspace",
    tags: ["browsing", "workflow", "focus"],
    kind: "article",
    cover: "quote",
    color: "lavender",
    collection: "inspiration",
    summary:
      "Open tabs are often unfinished intentions. Give each intention a durable home, and closing a tab can become a useful ending instead of a small act of forgetting.",
    text: "When your browser becomes a workspace\n\nOriginal sample reading.\n\nA row of tabs can represent a question, a comparison, a tutorial in progress, and something you might read later. The tabs stay open because the context has nowhere else to go.\n\nCapture that context before decluttering. Preserve the page title, its exact URL, a useful excerpt, and the time you read it. Confirm the save before offering to close the original tab. Pinned tabs, changed URLs, and unsupported browser pages should be left alone.\n\nA browser side panel can hold the memory while the source remains visible. A keyboard shortcut makes a single-page capture quick, but a batch action needs clear progress and individual failure reports. One unreadable page should not erase the rest of a successful session.\n\nThe satisfying moment is not the tabs disappearing. It is reopening the right source later because you remembered one detail.",
  },
  {
    slug: "indexeddb-guide",
    title: "IndexedDB without the sharp edges",
    tags: ["indexeddb", "storage", "offline"],
    kind: "documentation",
    cover: "code",
    color: "mint",
    collection: "building",
    summary:
      "A transaction is the boundary between an attempted save and a completed one. Keep writes together, handle denied storage, and build a way to export your work.",
    text: "IndexedDB without the sharp edges\n\nOriginal Tab Brain developer guide.\n\nIndexedDB stores structured objects in browser-managed databases. An object store can use a stable ID as its key and an index to find records by canonical URL. A canonical URL may remove a fragment and known tracking parameters while preserving content-changing query parameters.\n\nWrite related records in a transaction. Attach completion and failure handlers before issuing writes, and wait for transaction completion before claiming success. Do not put unrelated asynchronous network work inside a live database transaction: it can become inactive while you wait.\n\nOn a quota error, leave the source tabs open and explain that the save did not finish. On a version change, close old database connections so an upgrade can continue.\n\nExport backups without API configuration, session tokens, and live tab IDs. Validate imported URLs and bound file size, record count, and text lengths. Importing an older backup should not overwrite a newer local edit.",
  },
  {
    slug: "folio-notes",
    title: "Folio: lightweight knowledge management",
    tags: ["notes", "tools", "pricing"],
    kind: "tool",
    cover: "layers",
    color: "rose",
    collection: "research",
    summary:
      "Folio is the sample option for a portable personal notebook. It prioritizes plain-text export and full offline editing over team features.",
    text: "Folio — fictional product for the Tab Brain demo\n\nAll prices and features here are synthetic examples. Folio is not a real offer.\n\nFolio is an example personal knowledge tool with backlinks, tags, full offline editing, and plain-text export. Its fictional Personal plan is a one-time $39 payment. The example has no monthly subscription.\n\nIts strengths are portability, offline access, and a simple local notebook. Its limits are the absence of live collaboration, a browser capture flow that saves text rather than screenshots, and no visual canvas.\n\nFolio is the lowest ongoing-cost option in this four-tool sample if one person wants to keep notes offline. It does not solve team editing. Compare Relay for team sharing and Canvas for visual arrangement. Pricing in this fixture is authored demonstration data, not a current market comparison.",
  },
  {
    slug: "nano-practical-guide",
    title: "A practical guide to on-device AI",
    tags: ["gemini-nano", "offline", "privacy"],
    kind: "guide",
    cover: "orbit",
    color: "sand",
    collection: "building",
    summary:
      "On-device inference can turn readable page text into a compact memory. Check device support, initialize the downloaded model after a click, and keep cloud fallback explicit.",
    text: "A practical guide to on-device AI\n\nOriginal sample guide; consult the linked official setup in Tab Brain settings for current requirements.\n\nAn on-device language model runs its inference on a compatible computer. The model must be available and downloaded before useful offline generation is possible. Browser APIs and hardware support differ between devices.\n\nFirebase AI Logic offers an ONLY_ON_DEVICE mode. Use that mode for private page summaries so a failure does not silently become a cloud request. Initialize the device model from a user interaction and show model-download progress when available.\n\nGive the model bounded readable text and request a short summary, three useful tags, and supporting excerpts. Treat the page as untrusted data, not instructions. Keep the original text available for offline keyword retrieval.\n\nIf local inference is unavailable, save a clearly labeled excerpt and explain that an AI summary is pending. Do not call an excerpt a model-generated summary. Cloud comparisons can be a separate action with their own preview and approval.",
  },
  {
    slug: "canvas-visual-notes",
    title: "Canvas: visual notes for curious minds",
    tags: ["design", "tools", "pricing"],
    kind: "tool",
    cover: "window",
    color: "sky",
    collection: "research",
    summary:
      "Canvas is the sample tool for arranging ideas spatially. Its fictional plan adds a visual board and shared review, with a trade-off in portability.",
    text: "Canvas — fictional product for the Tab Brain demo\n\nSynthetic example product data and pricing.\n\nCanvas is an example visual knowledge workspace. It supports a spatial canvas, embedded links, colored groups, and shared read-only review. The fictional Solo plan costs $12 per month with monthly billing.\n\nIts strengths are visual arrangement, easy grouping, and a helpful overview of connected sources. Its limitations are that full editing requires a network connection, export is limited to PDF in this example, and simultaneous team editing is not included.\n\nCanvas is the sample choice for a researcher who thinks in diagrams and can accept online editing. For offline text work, compare Folio. For a source-to-brief writing workflow, compare Orbit. These details are authored fixtures and should not be used to make real purchases.",
  },
  {
    slug: "side-panel",
    title: "Building a browser side panel",
    tags: ["chrome", "extensions", "frontend"],
    kind: "documentation",
    cover: "window",
    color: "lavender",
    collection: "building",
    summary:
      "A side panel keeps your tools beside the page you are reading. Put durable state in storage and keep capture requests separate from the panel’s lifetime.",
    text: "Building a browser side panel\n\nOriginal sample developer note.\n\nA Chrome extension can provide a side panel through its sidePanel permission and a default panel path. Its action can open that panel when clicked. The background service worker may restart, so it should not be the only home for important state.\n\nSave a pending capture command in extension storage with a unique request ID. The panel can read the command when mounted and subscribe to future storage changes. Once handled, remove it so reopening the panel does not duplicate the operation.\n\nReadable page extraction can be injected only after a capture action. Restricted chrome pages and pages without usable text need an individual skip message. Always wait for a durable local save before offering to close the source tab.\n\nAn extension panel has its own origin and therefore its own IndexedDB database. A hosted companion does not share that database automatically. Use a portable backup to move a library between them.",
  },
  {
    slug: "private-search",
    title: "Search that respects your privacy",
    tags: ["search", "privacy", "local-first"],
    kind: "article",
    cover: "quote",
    color: "peach",
    collection: "building",
    summary:
      "A local search index can answer a surprising number of recall questions. Search the page text as well as its title, and be clear about what the ranking can do.",
    text: "Search that respects your privacy\n\nOriginal sample field note.\n\nA person might remember a detail without remembering the title of the page. Index the title, tags, summary, and saved page text. Match useful words while ignoring common phrases such as find that article about. Weight title and tag matches more strongly than a single occurrence deep in the text.\n\nA keyword ranking is not semantic understanding. It will miss a paraphrase when none of the words overlap. That limitation is easier to trust when search results stay visible and each result opens its original source.\n\nNo model call is necessary for ordinary local recall. The query and saved text can stay on the device, including while offline. A later cloud question should select only relevant summaries and excerpts, rather than sending the whole library.\n\nMake tags clickable and the query easy to clear. A useful empty state suggests fewer words instead of claiming that the remembered page never existed.",
  },
  {
    slug: "relay-team-knowledge",
    title: "Relay: a home for team knowledge",
    tags: ["collaboration", "tools", "pricing"],
    kind: "tool",
    cover: "layers",
    color: "mint",
    collection: "research",
    summary:
      "Relay is the team-oriented option in this fictional comparison. Shared editing and permissions come with a per-person subscription and online-only editing.",
    text: "Relay — fictional product for the Tab Brain demo\n\nThese are synthetic sample features and prices.\n\nRelay is an example shared knowledge workspace with simultaneous editing, team collections, permissions, and source comments. Its fictional Team plan costs $8 per member per month with monthly billing. A team of four would therefore pay $32 per month in this sample.\n\nIts strengths are shared editing, access controls, and one place for a team to discuss a source. Its limitations are that editing requires an internet connection and individual local backups are not available in this example.\n\nRelay is the strongest collaborative option among the four fictional tools. Folio offers the clearest offline ownership. Orbit focuses on writing, and Canvas on spatial arrangement. None of these fixture prices is a real-world offer.",
  },
  {
    slug: "notes-outlive-tabs",
    title: "Notes that outlive your tabs",
    tags: ["research", "notes", "workflow"],
    kind: "article",
    cover: "garden",
    color: "rose",
    collection: "inspiration",
    summary:
      "A saved link needs a little context to be useful next week. Keep a short explanation, an excerpt, and the original date together.",
    text: "Notes that outlive your tabs\n\nOriginal sample essay.\n\nA bookmark tells you where a page was. A useful memory also tells you why it mattered. Save one or two concise sentences, three practical topic tags, and an excerpt that contains the detail you may need again.\n\nKeep the original URL beside the note. A copied excerpt is evidence of what was captured, not a guarantee that the live page still says the same thing. Show a capture date for changing information.\n\nGive saved work a portable shape. A JSON backup can preserve the text and source links while excluding private connection settings. An imported note should show that it came from a backup rather than pretending that a model just analyzed it.\n\nSmall collections and favorites make revisiting enjoyable. Search connects ideas across them. The purpose is less time reconstructing context, not a larger pile of unread links.",
  },
  {
    slug: "research-to-decision",
    title: "From a pile of research to a decision",
    tags: ["research", "decisions", "strategy"],
    kind: "guide",
    cover: "quote",
    color: "sand",
    collection: "research",
    summary:
      "Choose a question before choosing your sources. A good comparison separates evidence, missing information, and the decision you can actually make.",
    text: "From a pile of research to a decision\n\nAn original sample guide.\n\nBegin with a concrete question: which of these four tools supports the workflow I need at a price I can compare? Select the relevant sources and preserve the passages about that workflow and price.\n\nA source-grounded comparison should cite its evidence. It should distinguish a monthly price from a one-time payment and account for per-person pricing. Missing details should be called unknown rather than guessed.\n\nBefore using cloud synthesis, preview exactly which summaries and excerpts are being shared. Keep unrelated notes out of the payload. If a model cites a source number that was not approved, reject the answer rather than inventing a link.\n\nA useful decision brief can be short: the best fit for this particular need, the trade-off, the price evidence as captured, and the question to verify before purchasing. AI assists the comparison; the reader still owns the decision.",
  },
];

export function makeSampleMemories(): Memory[] {
  const now = Date.now();
  return samplePages.map((page, index) => ({
    id: `sample-${page.slug}`,
    title: page.title,
    url: `${publicSite}/samples/${page.slug}.html`,
    canonicalUrl: `${publicSite}/samples/${page.slug}.html`,
    text: page.text,
    summary: page.summary,
    excerpts: page.text
      .split("\n\n")
      .filter((x) => x.length > 90)
      .slice(0, 3),
    tags: page.tags,
    kind: page.kind,
    cover: page.cover,
    color: page.color,
    source: "sample",
    analysis: "sample",
    savedAt: new Date(now - index * 95 * 60_000).toISOString(),
    updatedAt: new Date(now - index * 95 * 60_000).toISOString(),
    favorite: index === 0 || index === 1 || index === 8,
    archived: false,
    collectionIds: [page.collection],
  }));
}
