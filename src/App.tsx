import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Archive,
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  Bell,
  Check,
  ChevronDown,
  ChevronRight,
  Clock3,
  Cloud,
  Download,
  FolderPlus,
  HardDrive,
  Heart,
  Layers,
  LayoutGrid,
  List,
  LoaderCircle,
  Menu,
  Network,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  WifiOff,
  X,
} from "lucide-react";
import { BrandMark, MiniOrb } from "./components/Brand";
import { MemoryCard } from "./components/MemoryCard";
import { TopicMap } from "./components/TopicMap";
import { Modal } from "./components/Modal";
import { CaptureModal } from "./components/CaptureModal";
import { DetailModal } from "./components/DetailModal";
import { InstallModal } from "./components/InstallModal";
import { AskView } from "./components/AskView";
import { SettingsView } from "./components/SettingsView";
import { ModelBadge } from "./components/ModelBadge";
import { ReturnView } from "./components/ReturnView";
import {
  requestReminderPermission,
  returnQueue,
  showWebReminder,
} from "./reminders";
import { syncExtensionReminders } from "./extensionReminders";
import { isExtension } from "./constants";
import { friendlyError, localModelReady, resetModels } from "./ai";
import * as db from "./db";
import {
  MAX_IMPORT_BYTES,
  parseBackup,
  rankMemories,
  serializeBackup,
} from "./library";
import { makeSampleMemories, sampleCollections } from "./seed";
import type { AIConfig, LibrarySnapshot, Memory } from "./types";

type Nav =
  | "all"
  | "favorites"
  | "recent"
  | "archive"
  | "ask"
  | "settings"
  | "reminders"
  | `collection:${string}`;
const empty: LibrarySnapshot = {
  memories: [],
  collections: [],
  activity: [],
  settings: { initialized: false, cloudBytes: 0, cloudRequests: 0 },
};
const initialNav = (): Nav => {
  const hash = location.hash.slice(1).split("?")[0];
  if (hash.startsWith("collection:")) {
    try {
      return `collection:${decodeURIComponent(hash.slice(11))}`;
    } catch {
      return "all";
    }
  }
  return [
    "settings",
    "ask",
    "favorites",
    "archive",
    "recent",
    "reminders",
  ].includes(hash)
    ? (hash as Nav)
    : "all";
};
const initialMemory = () =>
  new URLSearchParams(location.hash.split("?")[1] ?? "").get("memory") ??
  undefined;

export default function App() {
  const [data, setData] = useState<LibrarySnapshot>(empty);
  const [loading, setLoading] = useState(true);
  const [fatal, setFatal] = useState("");
  const [nav, setNav] = useState<Nav>(initialNav);
  const navRef = useRef(nav);
  navRef.current = nav;
  const [query, setQuery] = useState("");
  const [tag, setTag] = useState("");
  const [view, setView] = useState<"grid" | "list" | "topics">("grid");
  const [sort, setSort] = useState("newest");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [detailId, setDetailId] = useState<string | undefined>(initialMemory);
  const [capture, setCapture] = useState<{
    scope: "all" | "current";
    tabId?: number;
  }>();
  const [install, setInstall] = useState(false);
  const [collectionModal, setCollectionModal] = useState(false);
  const [collectionName, setCollectionName] = useState("");
  const [collectionError, setCollectionError] = useState("");
  const [deleteCollectionId, setDeleteCollectionId] = useState<string>();
  const [toast, setToast] = useState<{ text: string; error?: boolean }>();
  const [sidebar, setSidebar] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);
  const [localReady, setLocalReady] = useState(localModelReady());
  const [now, setNow] = useState(Date.now());
  const searchRef = useRef<HTMLInputElement>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const handledCommands = useRef(new Set<string>());
  const refresh = useCallback(async () => {
    setData(await db.snapshot());
  }, []);
  const notify = useCallback(
    (text: string, error = false) => setToast({ text, error }),
    [],
  );

  useEffect(() => {
    function followHash() {
      const next = initialNav();
      if (next !== navRef.current) {
        setNav(next);
        setQuery("");
        setTag("");
        setSelectedIds([]);
        setSidebar(false);
      }
      setDetailId(initialMemory());
    }
    window.addEventListener("hashchange", followHash);
    return () => window.removeEventListener("hashchange", followHash);
  }, []);
  useEffect(() => {
    if (loading) return;
    let active = true;
    async function tick() {
      setNow(Date.now());
      if (
        isExtension ||
        !data.settings.reminderNotifications ||
        typeof Notification === "undefined" ||
        Notification.permission !== "granted"
      )
        return;
      try {
        const due = await db.claimDueReminders();
        if (!active) return;
        for (const memory of due) await showWebReminder(memory);
        if (due.length) await refresh();
      } catch (error) {
        if (active) notify(friendlyError(error), true);
      }
    }
    void tick();
    const timer = setInterval(() => {
      void tick();
    }, 30_000);
    function wake() {
      if (document.visibilityState === "visible") {
        void refresh().catch(() => undefined);
        void tick();
      }
    }
    document.addEventListener("visibilitychange", wake);
    return () => {
      active = false;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", wake);
    };
  }, [loading, data.settings.reminderNotifications, refresh, notify]);
  useEffect(() => {
    if (!loading && isExtension)
      void syncExtensionReminders(
        data.memories,
        data.settings.reminderNotifications === true,
      ).catch((error) => notify(friendlyError(error), true));
  }, [loading, data.memories, data.settings.reminderNotifications, notify]);
  useEffect(() => {
    let active = true;
    db.initializeLibrary(
      isExtension ? [] : makeSampleMemories(),
      sampleCollections,
    )
      .then(db.snapshot)
      .then((snapshot) => {
        if (active) setData(snapshot);
      })
      .catch((error) => {
        if (active) setFatal(friendlyError(error));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    if (import.meta.env.PROD && !isExtension && "serviceWorker" in navigator)
      void navigator.serviceWorker.register("./sw.js").catch(() => undefined);
    return () => {
      active = false;
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(
      () => setToast(undefined),
      toast.error ? 10_000 : 5000,
    );
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    function keys(event: KeyboardEvent) {
      const editing =
        /INPUT|TEXTAREA|SELECT/.test((event.target as HTMLElement)?.tagName) ||
        (event.target as HTMLElement)?.isContentEditable;
      if (
        ((event.metaKey || event.ctrlKey) && event.key === "k") ||
        (!editing && event.key === "/")
      ) {
        event.preventDefault();
        setNav("all");
        requestAnimationFrame(() => searchRef.current?.focus());
      }
    }
    window.addEventListener("keydown", keys);
    return () => window.removeEventListener("keydown", keys);
  }, []);
  useEffect(() => {
    if (!isExtension || loading) return;
    function handle(request: unknown) {
      if (!request || typeof request !== "object") return;
      const value = request as Record<string, unknown>;
      if (
        typeof value.nonce !== "string" ||
        !value.nonce ||
        handledCommands.current.has(value.nonce)
      )
        return;
      handledCommands.current.add(value.nonce);
      setCapture({
        scope: value.scope === "all" ? "all" : "current",
        tabId:
          typeof value.tabId === "number" &&
          Number.isInteger(value.tabId) &&
          value.tabId >= 0
            ? value.tabId
            : undefined,
      });
      void chrome.storage.local.remove("pendingCapture");
    }
    void chrome.storage.local
      .get("pendingCapture")
      .then((value) => handle(value.pendingCapture));
    const listener = (
      changes: Record<string, chrome.storage.StorageChange>,
      area: string,
    ) => {
      if (area === "local" && changes.pendingCapture)
        handle(changes.pendingCapture.newValue);
    };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, [loading]);

  const activeMemories = data.memories.filter((m) => !m.archived);
  const favoriteCount = activeMemories.filter((m) => m.favorite).length;
  const tags = [...new Set(activeMemories.flatMap((m) => m.tags))];
  const sampleCount = data.memories.filter((m) => m.source === "sample").length;
  const dueCount = returnQueue(data.memories, now).due.length;
  const currentCollection = nav.startsWith("collection:")
    ? data.collections.find((c) => c.id === nav.slice(11))
    : undefined;
  const detail = data.memories.find((m) => m.id === detailId);
  const visible = useMemo(() => {
    const filtered = data.memories.filter((memory) => {
      if (nav === "archive" ? !memory.archived : memory.archived) return false;
      if (nav === "favorites" && !memory.favorite) return false;
      if (
        nav === "recent" &&
        Date.now() - Date.parse(memory.savedAt) > 48 * 60 * 60_000
      )
        return false;
      if (
        nav.startsWith("collection:") &&
        !memory.collectionIds.includes(nav.slice(11))
      )
        return false;
      if (tag && !memory.tags.includes(tag)) return false;
      return true;
    });
    const ranked = rankMemories(filtered, query);
    if (sort === "title")
      return ranked.sort((a, b) => a.title.localeCompare(b.title));
    if (sort === "oldest")
      return ranked.sort((a, b) => a.savedAt.localeCompare(b.savedAt));
    if (sort === "newest" && !query.trim())
      return ranked.sort((a, b) => b.savedAt.localeCompare(a.savedAt));
    return ranked;
  }, [data.memories, nav, query, sort, tag]);
  function navigate(next: Nav) {
    setNav(next);
    navRef.current = next;
    setQuery("");
    setTag("");
    setSidebar(false);
    setSelectedIds([]);
    location.hash = next.startsWith("collection:")
      ? "collection:" + encodeURIComponent(next.slice(11))
      : next === "all"
        ? "memories"
        : next;
  }
  function filterTag(next: string) {
    setNav("all");
    navRef.current = "all";
    setTag(next);
    setQuery("");
    setView("grid");
    setSelectedIds([]);
    location.hash = "memories";
  }
  async function updateMemory(memory: Memory) {
    try {
      await db.putMemories([memory]);
      await refresh();
    } catch (error) {
      notify(friendlyError(error), true);
      throw error;
    }
  }
  async function captured(message: string) {
    await refresh();
    setLocalReady(localModelReady());
    notify(message);
  }
  async function saveConfig(config?: AIConfig) {
    await db.updateSettings({ ai: config });
    resetModels();
    setLocalReady(false);
    await refresh();
  }
  async function changeNotifications(enabled: boolean) {
    if (enabled) await requestReminderPermission();
    await db.updateSettings({ reminderNotifications: enabled });
    await refresh();
    notify(
      enabled
        ? "Notifications enabled for your return visits."
        : "Notifications turned off. Your reminders are still saved.",
    );
  }
  function exportBackup() {
    const blob = new Blob([serializeBackup(data.memories, data.collections)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tab-brain-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    notify("Backup downloaded. Connection settings were excluded.");
  }
  async function importBackup(file?: File) {
    if (!file) return;
    try {
      if (file.size > MAX_IMPORT_BYTES)
        throw new Error("Choose a backup smaller than 12 MB.");
      const backup = parseBackup(await file.text());
      await db.importLibrary(backup.memories, backup.collections);
      await refresh();
      notify(
        `${backup.memories.length} backup memories checked. Newer local edits kept.`,
      );
    } catch (error) {
      notify(friendlyError(error), true);
    }
  }
  const libraryTitle =
    nav === "favorites"
      ? "The ones you keep coming back to."
      : nav === "recent"
        ? "Fresh in your memory."
        : nav === "archive"
          ? "Put away, never forgotten."
          : currentCollection
            ? currentCollection.name
            : "";

  return (
    <div className={`app-shell ${isExtension ? "extension-shell" : ""}`}>
      {sidebar && (
        <button
          className="sidebar-scrim"
          aria-label="Close navigation"
          onClick={() => setSidebar(false)}
        />
      )}
      <aside className={`sidebar ${sidebar ? "sidebar-open" : ""}`}>
        <button
          className="brand"
          onClick={() => navigate("all")}
          aria-label="Tab Brain home"
        >
          <span className="brand-square">
            <BrandMark />
          </span>
          <span>
            tab<span className="brand-light">brain</span>
            <sup>®</sup>
          </span>
        </button>
        <button
          className="workspace-picker"
          onClick={() => navigate("settings")}
        >
          <span className="workspace-avatar">Y</span>
          <span>
            <strong>Your little workspace</strong>
            <small>Personal · on this device</small>
          </span>
          <ChevronDown size={13} />
        </button>
        <span className="nav-label">YOUR SPACE</span>
        <nav aria-label="Main navigation">
          <button
            className={`nav-item ${nav === "all" ? "active" : ""}`}
            onClick={() => navigate("all")}
          >
            <Layers size={17} />
            <span>All memories</span>
            <b>{activeMemories.length}</b>
          </button>
          <button
            className={`nav-item ${nav === "favorites" ? "active" : ""}`}
            onClick={() => navigate("favorites")}
          >
            <Heart size={17} />
            <span>Favorites</span>
            <b>{favoriteCount}</b>
          </button>
          <button
            className={`nav-item ${nav === "recent" ? "active" : ""}`}
            onClick={() => navigate("recent")}
          >
            <Clock3 size={17} />
            <span>Recently saved</span>
          </button>
          <button
            className={`nav-item ${nav === "reminders" ? "active" : ""}`}
            onClick={() => navigate("reminders")}
          >
            <Bell size={17} />
            <span>Return visits</span>
            {dueCount > 0 && <b>{dueCount}</b>}
          </button>
          <button
            className={`nav-item ${nav === "ask" ? "active" : ""} ask-nav`}
            onClick={() => navigate("ask")}
          >
            <Sparkles size={17} />
            <span>Ask my tabs</span>
            <span className="nav-new">AI</span>
          </button>
        </nav>
        <div className="nav-label label-with-action">
          <span>COLLECTIONS</span>
          <button
            className="icon-button"
            aria-label="Create collection"
            onClick={() => {
              setCollectionModal(true);
              setCollectionName("");
              setCollectionError("");
            }}
          >
            <Plus size={15} />
          </button>
        </div>
        <nav aria-label="Collections" className="collections-nav">
          {data.collections.map((collection) => (
            <div className="collection-nav-row" key={collection.id}>
              <button
                className={`nav-item ${nav === `collection:${collection.id}` ? "active" : ""}`}
                onClick={() => navigate(`collection:${collection.id}`)}
              >
                <span
                  className="collection-dot"
                  style={{ backgroundColor: collection.color }}
                />
                <span>{collection.name}</span>
                <b>
                  {
                    activeMemories.filter((m) =>
                      m.collectionIds.includes(collection.id),
                    ).length
                  }
                </b>
              </button>
              <button
                className="collection-delete"
                aria-label={`Delete collection ${collection.name}`}
                onClick={() => setDeleteCollectionId(collection.id)}
              >
                <X size={12} />
              </button>
            </div>
          ))}
          <button
            className="new-collection"
            onClick={() => {
              setCollectionModal(true);
              setCollectionName("");
              setCollectionError("");
            }}
          >
            <FolderPlus size={15} />
            New collection
          </button>
        </nav>
        <div className="sidebar-bottom">
          <div className="privacy-note">
            <span className="privacy-symbol">
              <ShieldCheck size={19} />
            </span>
            <strong>Yours to keep.</strong>
            <p>
              Your memories live on this device. Your curiosity stays yours.
            </p>
            <span className="local-indicator">
              <i />
              Stored locally
            </span>
          </div>
          <nav aria-label="More navigation">
            <button
              className={`nav-item ${nav === "archive" ? "active" : ""}`}
              onClick={() => navigate("archive")}
            >
              <Archive size={16} />
              <span>Archive</span>
            </button>
            <button
              className={`nav-item ${nav === "settings" ? "active" : ""}`}
              onClick={() => navigate("settings")}
            >
              <Settings2 size={16} />
              <span>Settings & backups</span>
            </button>
          </nav>
          <div className="sidebar-footer">
            <span className="profile-avatar">you</span>
            <span>
              <strong>Personal workspace</strong>
              <small>A little more headspace.</small>
            </span>
            <button
              className="icon-button"
              aria-label="Open settings"
              onClick={() => navigate("settings")}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button mobile-menu"
              onClick={() => setSidebar(true)}
              aria-label="Open navigation"
            >
              <Menu size={19} />
            </button>
            <span>Your workspace</span>
            <ChevronRight size={13} />
            <strong>
              {nav === "ask"
                ? "Ask my tabs"
                : nav === "settings"
                  ? "Settings"
                  : nav === "reminders"
                    ? "Return visits"
                    : currentCollection?.name ||
                      (nav === "all"
                        ? "All memories"
                        : nav === "favorites"
                          ? "Favorites"
                          : nav === "archive"
                            ? "Archive"
                            : "Recently saved")}
            </strong>
          </div>
          <div className="topbar-actions">
            <span className={`connection-indicator ${online ? "" : "offline"}`}>
              {online ? <span className="tiny-dot" /> : <WifiOff size={12} />}{" "}
              {online ? "Local workspace" : "You’re offline"}
            </span>
            <button
              className="model-indicator"
              onClick={() => navigate("settings")}
              aria-label="Open AI settings"
            >
              <ModelBadge compact />
            </button>
            {!isExtension && (
              <button
                className="button top-install"
                onClick={() => setInstall(true)}
              >
                <Plus size={13} />
                Add to Chrome
              </button>
            )}
          </div>
        </header>
        <main id="main-content" className="main-content">
          {fatal && (
            <div className="fatal-error" role="alert">
              <ShieldCheck size={18} />
              <div>
                <strong>We couldn’t open local storage.</strong>
                <p>{fatal}</p>
              </div>
              <button
                className="button secondary"
                onClick={() => location.reload()}
              >
                Try again
              </button>
            </div>
          )}
          {loading ? (
            <div className="initial-loading">
              <BrandMark />
              <LoaderCircle size={22} className="spin" />
              <p>Making a little room for your ideas…</p>
            </div>
          ) : nav === "ask" ? (
            <AskView
              memories={data.memories}
              selectedIds={selectedIds}
              config={data.settings.ai}
              onConnect={() => navigate("settings")}
              onLedger={(settings) =>
                setData((current) => ({ ...current, settings }))
              }
            />
          ) : nav === "reminders" ? (
            <ReturnView
              memories={data.memories}
              now={now}
              notifications={data.settings.reminderNotifications === true}
              onNotifications={changeNotifications}
              onOpen={setDetailId}
              onUpdate={updateMemory}
            />
          ) : nav === "settings" ? (
            <SettingsView
              key={data.settings.ai?.firebase.projectId || "unconfigured"}
              settings={data.settings}
              memories={data.memories}
              collections={data.collections}
              sampleCount={sampleCount}
              onSave={saveConfig}
              onExport={exportBackup}
              onImport={() => importRef.current?.click()}
              onClearSamples={async () => {
                await db.clearSampleMemories();
                await refresh();
                notify("Sample pages removed. Make this space your own.");
              }}
              onLocalReady={() => setLocalReady(true)}
            />
          ) : (
            <>
              {nav === "all" && !query && !tag ? (
                <section className="welcome-banner">
                  <div className="hero-copy">
                    <span className="hero-eyebrow">
                      <span className="tiny-star">✳</span>LESS CLUTTER. MORE
                      HEADSPACE.
                    </span>
                    <h1>
                      A little space for
                      <br />
                      everything you <em>find.</em>
                    </h1>
                    <p>
                      Save the good stuff. Close the tabs.
                      <br className="narrow-break" /> Come back when you’re
                      ready.
                    </p>
                    <div className="hero-actions">
                      <button
                        className="button dark"
                        onClick={() => setCapture({ scope: "all" })}
                      >
                        <Layers size={16} />
                        Snap all open tabs
                        <span className="button-shortcut">↗</span>
                      </button>
                      <button
                        className="hero-ask"
                        onClick={() => navigate("ask")}
                      >
                        Ask my tabs <ArrowUpRight size={15} />
                      </button>
                    </div>
                  </div>
                  <div className="hero-art">
                    <MiniOrb />
                    <span className="hero-art-caption">
                      <i />
                      GOOD IDEAS, IN GOOD COMPANY.
                    </span>
                  </div>
                </section>
              ) : (
                <div className="library-page-title">
                  <span className="eyebrow">
                    {currentCollection
                      ? "YOUR COLLECTION"
                      : tag
                        ? "FOLLOW A THREAD"
                        : query
                          ? "A LITTLE RECALL"
                          : "YOUR PERSONAL LIBRARY"}
                  </span>
                  <h1>
                    {query
                      ? "There it is. Somewhere in here."
                      : tag
                        ? `A little more about #${tag}.`
                        : libraryTitle}
                  </h1>
                  <p>
                    {nav === "archive"
                      ? "Saved pages you’ve put aside. Restore one whenever you need it."
                      : currentCollection
                        ? `${visible.length} ${visible.length === 1 ? "memory" : "memories"}, a shared thread, and room for one more.`
                        : "A useful detail is never very far away."}
                  </p>
                </div>
              )}
              <div className="memory-stats">
                <span>
                  <Layers size={14} />
                  <strong>{activeMemories.length}</strong> memories
                </span>
                <span>
                  <Network size={14} />
                  <strong>{tags.length}</strong> topics to explore
                </span>
                <span className="stats-privacy">
                  <ShieldCheck size={14} />
                  <strong>
                    {data.settings.cloudBytes.toLocaleString()}
                  </strong>{" "}
                  source bytes approved for AI
                  <span
                    className="tooltip"
                    tabIndex={0}
                    aria-label="This counts approved AI source payloads. Email copies, model downloads, and service requests are outside this AI source counter."
                  >
                    i
                  </span>
                </span>
                <button
                  className="stats-export"
                  onClick={exportBackup}
                  aria-label="Export your library"
                >
                  <ArrowDownToLine size={15} />
                </button>
              </div>
              <div className="library-layout">
                <section className="library-section">
                  <div className="library-toolbar">
                    <div className="section-heading">
                      <h2>
                        {currentCollection?.name ||
                          (nav === "favorites"
                            ? "Your favorites"
                            : nav === "archive"
                              ? "Archived memories"
                              : "Your memories")}
                        <span>{visible.length}</span>
                      </h2>
                      <p>A few things worth coming back to.</p>
                    </div>
                    <div
                      className="view-controls"
                      role="group"
                      aria-label="Library view"
                    >
                      <button
                        className={view === "grid" ? "active" : ""}
                        aria-label="Grid view"
                        aria-pressed={view === "grid"}
                        onClick={() => setView("grid")}
                      >
                        <LayoutGrid size={15} />
                      </button>
                      <button
                        className={view === "list" ? "active" : ""}
                        aria-label="List view"
                        aria-pressed={view === "list"}
                        onClick={() => setView("list")}
                      >
                        <List size={16} />
                      </button>
                      <button
                        className={view === "topics" ? "active" : ""}
                        aria-label="Topic view"
                        aria-pressed={view === "topics"}
                        onClick={() => setView("topics")}
                      >
                        <Network size={16} />
                      </button>
                    </div>
                  </div>
                  <div className="search-sort-row">
                    <div className="library-search">
                      <Search size={16} />
                      <input
                        ref={searchRef}
                        aria-label="Search your memories"
                        placeholder="Find that thing you read…"
                        value={query}
                        onChange={(e) => {
                          setQuery(e.target.value);
                          setSort(e.target.value ? "relevance" : "newest");
                        }}
                      />
                      {query ? (
                        <button
                          className="icon-button"
                          onClick={() => {
                            setQuery("");
                            setSort("newest");
                          }}
                          aria-label="Clear search"
                        >
                          <X size={14} />
                        </button>
                      ) : (
                        <kbd>/</kbd>
                      )}
                    </div>
                    <label className="sort-select">
                      <span className="sr-only">Sort memories</span>
                      <select
                        aria-label="Sort memories"
                        value={sort}
                        onChange={(e) => setSort(e.target.value)}
                      >
                        {query && <option value="relevance">Best match</option>}
                        <option value="newest">Newest first</option>
                        <option value="oldest">Oldest first</option>
                        <option value="title">Title A–Z</option>
                      </select>
                      <ChevronDown size={13} />
                    </label>
                  </div>
                  {tag && (
                    <div className="active-filter">
                      <span>
                        Exploring <strong>#{tag}</strong>
                      </span>
                      <button
                        onClick={() => setTag("")}
                        aria-label="Clear tag filter"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  )}
                  {selectedIds.length > 0 && (
                    <div className="selection-toolbar">
                      <span>
                        <Check size={15} />
                        {selectedIds.length} selected
                      </span>
                      <div>
                        <button
                          onClick={() => {
                            setNav("ask");
                            setQuery("");
                            setTag("");
                          }}
                          disabled={selectedIds.length > 8}
                        >
                          <Sparkles size={13} />
                          Ask selected
                          {selectedIds.length > 8 ? " (up to 8)" : ""}
                        </button>
                        <button
                          onClick={async () => {
                            const selected = data.memories.filter((m) =>
                              selectedIds.includes(m.id),
                            );
                            await db.putMemories(
                              selected.map((m) => ({
                                ...m,
                                archived: nav !== "archive",
                                updatedAt: new Date().toISOString(),
                              })),
                            );
                            setSelectedIds([]);
                            await refresh();
                            notify(
                              nav === "archive"
                                ? "Selected memories restored."
                                : "Selected memories archived.",
                            );
                          }}
                        >
                          <Archive size={13} />
                          {nav === "archive" ? "Restore" : "Archive"}
                        </button>
                        <button
                          onClick={() => setSelectedIds([])}
                          aria-label="Clear selection"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  )}
                  {sampleCount > 0 && nav === "all" && !query && !tag && (
                    <div className="sample-banner">
                      <span>
                        <Sparkles size={12} />A sample of what your memory could
                        look like.
                      </span>
                      <button onClick={() => setCapture({ scope: "all" })}>
                        Add your own <ArrowRight size={12} />
                      </button>
                    </div>
                  )}
                  {view === "topics" ? (
                    <div className="full-topic-card">
                      <TopicMap memories={visible} onTag={filterTag} />
                    </div>
                  ) : visible.length ? (
                    <div
                      className={`memory-grid ${view === "list" ? "memory-list" : ""}`}
                    >
                      {visible.map((memory) => (
                        <MemoryCard
                          key={memory.id}
                          memory={memory}
                          selected={selectedIds.includes(memory.id)}
                          list={view === "list"}
                          onSelect={() =>
                            setSelectedIds((ids) =>
                              ids.includes(memory.id)
                                ? ids.filter((id) => id !== memory.id)
                                : [...ids, memory.id],
                            )
                          }
                          onOpen={() => setDetailId(memory.id)}
                          onFavorite={() =>
                            void updateMemory({
                              ...memory,
                              favorite: !memory.favorite,
                              updatedAt: new Date().toISOString(),
                            }).catch(() => undefined)
                          }
                          onArchive={() =>
                            void updateMemory({
                              ...memory,
                              archived: !memory.archived,
                              updatedAt: new Date().toISOString(),
                            }).catch(() => undefined)
                          }
                          onTag={filterTag}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="library-empty">
                      <div>
                        <Search size={26} />
                      </div>
                      <h3>
                        {query || tag
                          ? "A little less specific, maybe?"
                          : nav === "archive"
                            ? "Nothing tucked away yet."
                            : "Your next good idea belongs here."}
                      </h3>
                      <p>
                        {query || tag
                          ? "Try fewer words, or clear the tag filter. Search looks through saved titles, tags, summaries, and page text."
                          : "Save a readable page and give your future self something to come back to."}
                      </p>
                      {query || tag ? (
                        <button
                          className="button secondary"
                          onClick={() => {
                            setQuery("");
                            setTag("");
                          }}
                        >
                          Show all memories
                        </button>
                      ) : (
                        <button
                          className="button dark"
                          onClick={() => setCapture({ scope: "all" })}
                        >
                          <Plus size={15} />
                          Save your first page
                        </button>
                      )}
                    </div>
                  )}
                  <div className="library-footer">
                    <span>
                      <HardDrive size={12} />
                      Saved here. Ready when you are.
                    </span>
                    <span>
                      {visible.length}{" "}
                      {visible.length === 1 ? "memory" : "memories"} ·{" "}
                      {query
                        ? "local keyword search"
                        : "a little less to keep in your head"}
                    </span>
                  </div>
                </section>
                <aside className="memory-aside">
                  <section className="connections-card">
                    <div className="aside-heading">
                      <span>YOUR IDEAS, CONNECTED</span>
                      <Network size={16} />
                    </div>
                    <h3>Follow a little thread.</h3>
                    <p>Good ideas rarely live alone.</p>
                    <TopicMap
                      memories={activeMemories}
                      onTag={filterTag}
                      compact
                    />
                    <button
                      className="text-link"
                      onClick={() => setView("topics")}
                    >
                      Explore your topics <ArrowUpRight size={13} />
                    </button>
                  </section>
                  <section className="activity-card">
                    <div className="aside-heading">
                      <span>A LITTLE ACTIVITY</span>
                      <Clock3 size={14} />
                    </div>
                    {data.activity.length ? (
                      data.activity.slice(0, 4).map((activity) => (
                        <div className="activity-item" key={activity.id}>
                          <span
                            className={`activity-symbol activity-${activity.kind}`}
                          >
                            {activity.kind === "cloud" ? (
                              <Cloud size={12} />
                            ) : activity.kind === "capture" ? (
                              <Plus size={12} />
                            ) : (
                              <Download size={12} />
                            )}
                          </span>
                          <div>
                            <strong>{activity.title}</strong>
                            <p>{activity.detail}</p>
                            <small>
                              {new Date(activity.at).toLocaleTimeString(
                                undefined,
                                { hour: "numeric", minute: "2-digit" },
                              )}
                            </small>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="fresh-activity">
                        <span>✳</span>
                        <strong>A fresh little start.</strong>
                        <p>
                          Your captures and approved cloud requests will appear
                          here.
                        </p>
                      </div>
                    )}
                  </section>
                  <div className="aside-quote">
                    <span>✳</span>
                    <p>
                      Good ideas deserve
                      <br />
                      <em>a return visit.</em>
                    </p>
                    <i>THAT’S WHAT WE’RE HERE FOR.</i>
                  </div>
                </aside>
              </div>
            </>
          )}
        </main>
        <footer className="workspace-footer">
          <span>
            <BrandMark />
            tab brain
          </span>
          <span>A little space for everything you find.</span>
          <button onClick={() => navigate("settings")}>
            Your privacy, in plain words <ArrowUpRight size={11} />
          </button>
        </footer>
      </div>
      <input
        ref={importRef}
        className="sr-only"
        type="file"
        aria-label="Import Tab Brain backup"
        accept=".json,application/json"
        onChange={(event) => {
          void importBackup(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
      {capture && (
        <CaptureModal
          memories={data.memories}
          collections={data.collections}
          config={data.settings.ai}
          scope={capture.scope}
          tabId={capture.tabId}
          onClose={() => setCapture(undefined)}
          onSaved={captured}
          onInstall={() => {
            setCapture(undefined);
            setInstall(true);
          }}
        />
      )}{" "}
      {detail && (
        <DetailModal
          memory={detail}
          collections={data.collections}
          config={data.settings.ai}
          onClose={() => setDetailId(undefined)}
          onUpdate={updateMemory}
          onDelete={async () => {
            await db.removeMemory(detail.id);
            setDetailId(undefined);
            setSelectedIds((ids) => ids.filter((id) => id !== detail.id));
            await refresh();
            notify("Memory removed from this device.");
          }}
          onConnect={() => {
            setDetailId(undefined);
            navigate("settings");
          }}
        />
      )}{" "}
      {install && <InstallModal onClose={() => setInstall(false)} />}
      {collectionModal && (
        <Modal
          title="Give a few ideas a home."
          eyebrow="A NEW COLLECTION"
          onClose={() => setCollectionModal(false)}
        >
          <form
            className="collection-form"
            onSubmit={async (event) => {
              event.preventDefault();
              const name = collectionName.trim();
              if (!name) return;
              if (
                data.collections.some(
                  (c) => c.name.toLowerCase() === name.toLowerCase(),
                )
              ) {
                setCollectionError(
                  "A collection with that name already exists.",
                );
                return;
              }
              try {
                const collection = {
                  id: crypto.randomUUID(),
                  name,
                  color: "#c4d9ad",
                };
                await db.putCollection(collection);
                await refresh();
                setCollectionModal(false);
                navigate(`collection:${collection.id}`);
                notify("A little home for your ideas, created.");
              } catch (error) {
                setCollectionError(friendlyError(error));
              }
            }}
          >
            <label>
              Collection name
              <input
                value={collectionName}
                onChange={(e) => setCollectionName(e.target.value)}
                placeholder="The next thing I’m curious about"
                maxLength={40}
                required
                autoFocus
              />
            </label>
            <p>
              A collection groups your memories. A page can live in more than
              one.
            </p>
            {collectionError && (
              <p className="inline-error" role="alert">
                {collectionError}
              </p>
            )}
            <button className="button dark" type="submit">
              <Plus size={15} />
              Create collection
            </button>
          </form>
        </Modal>
      )}
      {deleteCollectionId && (
        <Modal
          title="Remove this collection?"
          onClose={() => setDeleteCollectionId(undefined)}
        >
          <p className="modal-intro">
            Your saved memories will stay in your library. Only “
            {data.collections.find((c) => c.id === deleteCollectionId)?.name}”
            will be removed.
          </p>
          <div className="button-row">
            <button
              className="button danger"
              onClick={async () => {
                await db.removeCollection(deleteCollectionId);
                if (nav === `collection:${deleteCollectionId}`) navigate("all");
                setDeleteCollectionId(undefined);
                await refresh();
                notify("Collection removed. Your memories are still here.");
              }}
            >
              Remove collection
            </button>
            <button
              className="button ghost"
              onClick={() => setDeleteCollectionId(undefined)}
            >
              Keep it
            </button>
          </div>
        </Modal>
      )}
      {toast && (
        <div
          className={`toast ${toast.error ? "error-toast" : ""}`}
          role={toast.error ? "alert" : "status"}
        >
          <span>
            {toast.error ? <ShieldCheck size={17} /> : <Check size={17} />}
          </span>
          <p>{toast.text}</p>
          <button
            className="icon-button"
            aria-label="Dismiss notification"
            onClick={() => setToast(undefined)}
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
