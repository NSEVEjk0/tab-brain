import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  CircleAlert,
  HardDrive,
  Layers,
  LoaderCircle,
  PanelRightOpen,
  Plus,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { Modal } from "./Modal";
import { ModelBadge } from "./ModelBadge";
import { isExtension } from "../constants";
import { canonicalUrl, createMemory } from "../library";
import {
  friendlyError,
  initializeLocal,
  localModelReady,
  summarizeLocally,
} from "../ai";
import { idleAIStatus, localTextStatus } from "../aiStatus";
import { captureTargets, closePersistedTabs, extractTab } from "../extension";
import type { CaptureTarget } from "../extension";
import { putMemories } from "../db";
import type { Collection, Memory } from "../types";

export function CaptureModal({
  memories,
  collections,
  scope = "all",
  tabId,
  onClose,
  onSaved,
  onInstall,
}: {
  memories: Memory[];
  collections: Collection[];
  scope?: "all" | "current";
  tabId?: number;
  onClose: () => void;
  onSaved: (message: string) => Promise<void>;
  onInstall: () => void;
}) {
  const [targets, setTargets] = useState<CaptureTarget[]>([]);
  const [chosen, setChosen] = useState<number[]>([]);
  const [loading, setLoading] = useState(isExtension);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [collectionId, setCollectionId] = useState("");
  const [local, setLocal] = useState(localModelReady());
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState("");
  const [current, setCurrent] = useState(0);
  const [total, setTotal] = useState(0);
  const [saved, setSaved] = useState<Memory[]>([]);
  const [failures, setFailures] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [finished, setFinished] = useState(false);
  const [closeResult, setCloseResult] = useState("");
  const cancel = useRef(false);
  useEffect(() => {
    if (!isExtension) return;
    let mounted = true;
    captureTargets(scope, tabId)
      .then((items) => {
        if (mounted) {
          setTargets(items);
          setChosen(items.map((t) => t.id));
        }
      })
      .catch((error) => {
        if (mounted) setError(friendlyError(error));
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [scope, tabId]);
  async function prepareLocal(): Promise<boolean> {
    if (!local) return false;
    try {
      if (!localModelReady())
        await initializeLocal((value) =>
          setPhase(`Preparing on-device model · ${Math.round(value * 100)}%`),
        );
      return true;
    } catch (error) {
      setFailures((items) => [
        ...items,
        `${friendlyError(error)} Saving readable text and excerpts instead.`,
      ]);
      return false;
    }
  }
  async function saveOne(
    page: Parameters<typeof createMemory>[0],
    existing: Memory[],
    useLocal: boolean,
  ) {
    const previous = existing.find(
      (m) => m.canonicalUrl === canonicalUrl(page.url),
    );
    let memory = createMemory(page, previous);
    if (collectionId && !memory.collectionIds.includes(collectionId))
      memory.collectionIds.push(collectionId);
    await putMemories([memory], {
      kind: "capture",
      title: "A page remembered",
      detail: memory.title,
    });
    if (useLocal) {
      try {
        const summarized = await summarizeLocally(memory);
        await putMemories([summarized]);
        memory = summarized;
      } catch (error) {
        setFailures((items) => [
          ...items,
          `${memory.title}: text saved; ${friendlyError(error)}`,
        ]);
      }
    }
    return memory;
  }
  async function manual(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setFailures([]);
    setTotal(1);
    setCurrent(0);
    setPhase("Saving your page on this device…");
    try {
      const useLocal = await prepareLocal();
      if (!useLocal) localTextStatus();
      const memory = await saveOne({ title, url, text }, memories, useLocal);
      setSaved([memory]);
      setCurrent(1);
      setFinished(true);
      if (!useLocal) idleAIStatus(localModelReady());
      await onSaved("Page saved on this device.");
    } catch (error) {
      setError(friendlyError(error));
    } finally {
      setBusy(false);
    }
  }
  async function batch() {
    const selected = targets.filter((target) => chosen.includes(target.id));
    if (!selected.length) return;
    setBusy(true);
    setError("");
    setFailures([]);
    setSaved([]);
    setCurrent(0);
    setTotal(selected.length);
    cancel.current = false;
    const captured: Memory[] = [],
      existing = [...memories];
    try {
      const useLocal = await prepareLocal();
      for (let index = 0; index < selected.length; index++) {
        if (cancel.current) break;
        const target = selected[index];
        setPhase(`Remembering ${target.title}`);
        localTextStatus(`Reading “${target.title}” on this device.`);
        try {
          const page = await extractTab(target);
          const memory = await saveOne(page, existing, useLocal);
          captured.push(memory);
          const previousIndex = existing.findIndex((m) => m.id === memory.id);
          if (previousIndex >= 0) existing[previousIndex] = memory;
          else existing.push(memory);
          setSaved([...captured]);
        } catch (error) {
          setFailures((items) => [
            ...items,
            `${target.title}: ${friendlyError(error)}`,
          ]);
        }
        setCurrent(index + 1);
      }
      setFinished(true);
      if (!useLocal) idleAIStatus(localModelReady());
      await onSaved(
        `${captured.length} ${captured.length === 1 ? "page" : "pages"} saved on this device.`,
      );
    } catch (error) {
      setError(friendlyError(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={
        finished
          ? "A little less clutter. A little more clarity."
          : isExtension
            ? "Give your tabs a place to land."
            : "Keep something worth coming back to."
      }
      eyebrow={finished ? "YOUR MEMORY, MADE" : "SAVE IT HERE. FIND IT LATER."}
      onClose={onClose}
      wide={isExtension}
      busy={busy}
    >
      {busy && (
        <div className="model-activity">
          <ModelBadge />
        </div>
      )}
      {finished ? (
        <div className="capture-finished">
          <div className="capture-check">
            <CheckCircle2 size={34} />
          </div>
          <h3>
            {saved.length}{" "}
            {saved.length === 1
              ? "page, safely saved."
              : "pages, safely saved."}
          </h3>
          <p>
            {saved.some((m) => m.analysis === "on-device")
              ? "Local AI summaries and original text are in your memory."
              : "Readable text and excerpts are in your memory. AI summaries can be added when on-device AI is enabled."}
          </p>
          {isExtension && saved.length > 0 && (
            <button
              className="button dark"
              disabled={Boolean(closeResult)}
              onClick={async () => {
                try {
                  const result = await closePersistedTabs(saved);
                  const message = `${result.closed} saved tabs closed${result.skipped ? ` · ${result.skipped} pinned, changed, or unavailable tabs left open` : ""}.`;
                  setCloseResult(message);
                  await onSaved(message);
                } catch (error) {
                  setError(friendlyError(error));
                }
              }}
            >
              <Layers size={16} />
              Close saved tabs
            </button>
          )}
          {closeResult && (
            <p className="inline-success" role="status">
              {closeResult}
            </p>
          )}
          <button className="button secondary" onClick={onClose}>
            Explore your memories <ArrowRight size={15} />
          </button>
          {failures.length > 0 && (
            <details className="capture-failures" open>
              <summary>{failures.length} notes about this capture</summary>
              {failures.map((failure, index) => (
                <p key={index}>
                  <CircleAlert size={14} />
                  {failure}
                </p>
              ))}
            </details>
          )}
        </div>
      ) : (
        <>
          {!isExtension && (
            <div className="capture-extension-note">
              <PanelRightOpen size={23} />
              <div>
                <strong>Want to snap all your open tabs?</strong>
                <p>
                  Add the Chrome extension. Here, you can save a page by pasting
                  its readable text.
                </p>
              </div>
              <button className="text-link" onClick={onInstall}>
                Get the extension <ArrowRight size={14} />
              </button>
            </div>
          )}
          {isExtension ? (
            <div className="tab-picker">
              {loading ? (
                <p className="loading-line">
                  <LoaderCircle className="spin" size={17} />
                  Looking at this window’s readable tabs…
                </p>
              ) : (
                <>
                  <div className="tab-picker-head">
                    <span>{targets.length} readable tabs in this window</span>
                    <button
                      className="text-link"
                      onClick={() =>
                        setChosen(
                          chosen.length === targets.length
                            ? []
                            : targets.map((t) => t.id),
                        )
                      }
                      disabled={busy}
                    >
                      {chosen.length === targets.length
                        ? "Deselect all"
                        : "Select all"}
                    </button>
                  </div>
                  {!targets.length && (
                    <p className="empty-inline">
                      Open an article, documentation page, or product page, then
                      try again. Browser settings and other restricted pages
                      cannot be captured.
                    </p>
                  )}
                  <div className="tab-picker-list">
                    {targets.map((target) => (
                      <label key={target.id}>
                        <input
                          type="checkbox"
                          checked={chosen.includes(target.id)}
                          disabled={busy}
                          onChange={() =>
                            setChosen(
                              chosen.includes(target.id)
                                ? chosen.filter((id) => id !== target.id)
                                : [...chosen, target.id],
                            )
                          }
                        />
                        <span>
                          <strong>{target.title}</strong>
                          <small>
                            {new URL(target.url).hostname}
                            {target.pinned ? " · pinned, will stay open" : ""}
                          </small>
                        </span>
                        <span className="tab-picker-dot" />
                      </label>
                    ))}
                  </div>
                </>
              )}
            </div>
          ) : (
            <form
              onSubmit={manual}
              className="capture-form"
              id="capture-page-form"
            >
              <div className="form-grid">
                <label>
                  Page title
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Something you want to remember"
                    required
                    maxLength={200}
                    disabled={busy}
                  />
                </label>
                <label>
                  Original page URL
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://example.com/article"
                    required
                    disabled={busy}
                  />
                </label>
              </div>
              <label>
                Readable page text
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Paste the article, notes, or documentation here…"
                  rows={7}
                  required
                  minLength={40}
                  maxLength={36000}
                  disabled={busy}
                />
              </label>
            </form>
          )}
          <div className="capture-options">
            <label>
              Keep in a collection
              <select
                value={collectionId}
                onChange={(e) => setCollectionId(e.target.value)}
                disabled={busy}
              >
                <option value="">Just my memories</option>
                {collections.map((c) => (
                  <option value={c.id} key={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="local-capture-option">
              <input
                type="checkbox"
                checked={local}
                onChange={(e) => setLocal(e.target.checked)}
                disabled={busy}
              />
              <div>
                <strong>
                  <Sparkles size={14} />
                  Summarize with on-device AI
                </strong>
                <small>Runs on supported desktop Chrome.</small>
              </div>
            </label>
          </div>
          {busy && (
            <div className="capture-progress" role="status">
              <div>
                <span>
                  <LoaderCircle size={15} className="spin" />
                  {phase}
                </span>
                <strong>
                  {current}/{total}
                </strong>
              </div>
              <progress value={current} max={total || 1} />
              <button
                className="text-link"
                onClick={() => {
                  cancel.current = true;
                  setPhase("Finishing this page, then stopping…");
                }}
                disabled={!isExtension}
              >
                <X size={13} />
                Stop after this page
              </button>
            </div>
          )}
          {error && (
            <p role="alert" className="inline-error">
              {error}
            </p>
          )}
          <div className="capture-footer">
            <span>
              <ShieldCheck size={15} />
              Page content stays on this device.
            </span>
            {isExtension ? (
              <button
                className="button dark"
                onClick={batch}
                disabled={busy || loading || !chosen.length}
              >
                {busy ? (
                  <LoaderCircle size={16} className="spin" />
                ) : (
                  <Layers size={16} />
                )}
                Snap {chosen.length} {chosen.length === 1 ? "tab" : "tabs"}
              </button>
            ) : (
              <button
                className="button dark"
                type="submit"
                form="capture-page-form"
                disabled={busy}
              >
                {busy ? (
                  <LoaderCircle size={16} className="spin" />
                ) : (
                  <Plus size={16} />
                )}
                Save on this device
              </button>
            )}
          </div>
        </>
      )}
      {finished && error && (
        <p role="alert" className="inline-error">
          {error}
        </p>
      )}
      {isExtension && !finished && (
        <p className="capture-hint">
          <HardDrive size={13} />
          Browser and restricted pages are skipped. Only saved, unchanged,
          unpinned tabs can be closed.
        </p>
      )}
    </Modal>
  );
}
