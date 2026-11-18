import { useState } from "react";
import {
  Archive,
  ArrowUpRight,
  BookCheck,
  BookOpen,
  Check,
  Heart,
  LoaderCircle,
  Sparkles,
  Trash2,
} from "lucide-react";
import { Modal } from "./Modal";
import { MemoryCover } from "./MemoryCard";
import { ModelBadge, ModelReceipt } from "./ModelBadge";
import { ReminderPanel } from "./ReminderPanel";
import {
  friendlyError,
  initializeLocal,
  localModelReady,
  summarizeLocally,
} from "../ai";
import { hostname } from "../library";
import { openSource } from "../extension";
import type { AIConfig, Collection, Memory } from "../types";

export function DetailModal({
  memory,
  collections,
  config,
  onClose,
  onUpdate,
  onDelete,
  onConnect,
}: {
  memory: Memory;
  collections: Collection[];
  config?: AIConfig;
  onClose: () => void;
  onUpdate: (memory: Memory) => Promise<void>;
  onDelete: () => Promise<void>;
  onConnect: () => void;
}) {
  const [tags, setTags] = useState(memory.tags.join(", "));
  const [selected, setSelected] = useState(memory.collectionIds);
  const [notes, setNotes] = useState(memory.notes ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  async function summarize() {
    if (!config) {
      onConnect();
      return;
    }
    setBusy(true);
    setError("");
    setMessage("Preparing local summary…");
    try {
      if (!localModelReady())
        await initializeLocal(config, (value) =>
          setMessage(`Preparing on-device model · ${Math.round(value * 100)}%`),
        );
      const updated = await summarizeLocally(memory, config);
      await onUpdate(updated);
      setMessage("Summary generated on this device.");
      setTags(updated.tags.join(", "));
    } catch (error) {
      setError(friendlyError(error));
      setMessage("");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={memory.title}
      eyebrow="A LITTLE SOMETHING, REMEMBERED"
      onClose={onClose}
      wide
      busy={busy}
    >
      {busy && (
        <div className="model-activity">
          <ModelBadge />
        </div>
      )}
      <div className="detail-layout">
        <div className="detail-main">
          <div className="detail-cover">
            <MemoryCover memory={memory} />
          </div>
          <div className="detail-source">
            <span>
              {hostname(memory)} ·{" "}
              {new Date(memory.savedAt).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
            <button
              className="text-link"
              onClick={() => void openSource(memory.url)}
            >
              Open original <ArrowUpRight size={14} />
            </button>
          </div>
          <div className="detail-summary">
            <span className="eyebrow">
              {memory.analysis === "on-device"
                ? "SUMMARIZED ON THIS DEVICE"
                : memory.analysis === "sample"
                  ? "AUTHORED SAMPLE SUMMARY"
                  : memory.analysis === "excerpt"
                    ? "SAVED TEXT EXCERPT · AI SUMMARY PENDING"
                    : "IMPORTED SUMMARY"}
            </span>
            <p>{memory.summary}</p>
            {memory.modelEvidence && memory.analysis === "on-device" && (
              <ModelReceipt evidence={memory.modelEvidence} />
            )}
          </div>
          <div className="detail-excerpts">
            <h3>A few things worth keeping</h3>
            {memory.excerpts.map((text, index) => (
              <blockquote key={index}>{text}</blockquote>
            ))}
          </div>
          <details className="original-text">
            <summary>
              Read the saved page text{" "}
              <span>{memory.text.length.toLocaleString()} characters</span>
            </summary>
            <p>{memory.text}</p>
          </details>
        </div>
        <aside className="detail-aside">
          <div className="detail-tools">
            <button
              className={`button ${memory.favorite ? "favorited" : "secondary"}`}
              onClick={() =>
                void onUpdate({
                  ...memory,
                  favorite: !memory.favorite,
                  updatedAt: new Date().toISOString(),
                })
              }
            >
              <Heart
                size={15}
                fill={memory.favorite ? "currentColor" : "none"}
              />
              {memory.favorite ? "A favorite" : "Add to favorites"}
            </button>
            <button
              className="button ghost"
              onClick={summarize}
              disabled={busy}
            >
              {busy ? (
                <LoaderCircle className="spin" size={15} />
              ) : (
                <Sparkles size={15} />
              )}{" "}
              {config ? "Summarize locally" : "Set up local AI"}
            </button>
          </div>
          <button
            className="button secondary reading-toggle"
            disabled={busy}
            onClick={async () => {
              setError("");
              try {
                await onUpdate({
                  ...memory,
                  readAt: memory.readAt ? undefined : new Date().toISOString(),
                  reminder: memory.readAt ? memory.reminder : undefined,
                  updatedAt: new Date().toISOString(),
                });
                setMessage(
                  memory.readAt
                    ? "Back on your reading list."
                    : "Marked as read.",
                );
              } catch (error) {
                setError(friendlyError(error));
              }
            }}
          >
            {memory.readAt ? <BookOpen size={15} /> : <BookCheck size={15} />}{" "}
            {memory.readAt ? "Mark as unread" : "Mark as read"}
          </button>
          <form
            onSubmit={async (event) => {
              event.preventDefault();
              setError("");
              try {
                const cleanTags = [
                  ...new Set(
                    tags
                      .split(",")
                      .map((x) => x.trim().replace(/^#/, "").slice(0, 30))
                      .filter(Boolean),
                  ),
                ].slice(0, 6);
                await onUpdate({
                  ...memory,
                  tags: cleanTags,
                  notes: notes.trim().slice(0, 4000),
                  collectionIds: selected,
                  updatedAt: new Date().toISOString(),
                });
                setMessage("Your notes, tags, and collections are saved.");
              } catch (error) {
                setError(friendlyError(error));
              }
            }}
          >
            <label>
              Your notes
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Why did you save this? What do you want to try?"
                rows={4}
                maxLength={4000}
              />
              <small>Private and searchable on this device.</small>
            </label>
            <label>
              Topic tags
              <input
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="design, research, notes"
              />
              <small>Separate up to 6 tags with commas.</small>
            </label>
            <span className="field-label">Keep in a collection</span>
            <div className="collection-checks">
              {collections.map((collection) => (
                <label key={collection.id}>
                  <input
                    type="checkbox"
                    checked={selected.includes(collection.id)}
                    onChange={() =>
                      setSelected(
                        selected.includes(collection.id)
                          ? selected.filter((x) => x !== collection.id)
                          : [...selected, collection.id],
                      )
                    }
                  />
                  <span
                    className="collection-dot"
                    style={{ backgroundColor: collection.color }}
                  />
                  {collection.name}
                </label>
              ))}
            </div>
            <button className="button secondary" type="submit">
              <Check size={14} />
              Save changes
            </button>
          </form>
          <ReminderPanel
            key={memory.reminder?.at ?? "no-reminder"}
            memory={memory}
            onUpdate={onUpdate}
          />
          {message && (
            <p role="status" className="inline-success">
              {message}
            </p>
          )}
          {error && (
            <p role="alert" className="inline-error">
              {error}
            </p>
          )}
          <div className="detail-management">
            <button
              className="text-link muted"
              onClick={async () => {
                await onUpdate({
                  ...memory,
                  archived: !memory.archived,
                  updatedAt: new Date().toISOString(),
                });
                onClose();
              }}
            >
              <Archive size={14} />
              {memory.archived ? "Restore to memories" : "Move to archive"}
            </button>
            {confirmDelete ? (
              <div className="delete-confirm">
                <p>Delete this memory from this device?</p>
                <button className="button danger" onClick={onDelete}>
                  Delete memory
                </button>
                <button
                  className="text-link"
                  onClick={() => setConfirmDelete(false)}
                >
                  Keep it
                </button>
              </div>
            ) : (
              <button
                className="text-link danger-text"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 size={14} />
                Delete memory
              </button>
            )}
          </div>
        </aside>
      </div>
    </Modal>
  );
}
