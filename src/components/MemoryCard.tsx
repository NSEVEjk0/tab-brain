import {
  ArrowUpRight,
  Bell,
  BookCheck,
  Check,
  Code2,
  FileText,
  Heart,
  MoreHorizontal,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
import { hostname } from "../library";
import type { Memory } from "../types";
import { formatReminder } from "../reminders";

export function MemoryCover({ memory }: { memory: Memory }) {
  const noun = memory.tags[0]?.replace(/-/g, " ") || "a good idea";
  return (
    <div className={`memory-cover color-${memory.color}`} aria-hidden="true">
      <span className="cover-label">
        {memory.kind === "tool"
          ? "THE TOOLKIT"
          : memory.kind === "documentation"
            ? "BUILD NOTES"
            : "THE READING ROOM"}
      </span>
      {memory.cover === "orbit" && (
        <div className="cover-orbits">
          <div />
          <div />
          <div />
          <span>✳</span>
        </div>
      )}
      {memory.cover === "code" && (
        <div className="cover-code">
          <div className="window-dots">
            <i />
            <i />
            <i />
          </div>
          <code>
            <span>const</span> ideas = <em>keep</em>({"{"}
            <br />
            <b> curious:</b> true,
            <br />
            <b> space:</b> 'to think'
            <br />
            {"}"});
            <br />
            <small>// make it yours.</small>
          </code>
        </div>
      )}
      {memory.cover === "window" && (
        <div className="cover-browser">
          <div className="window-dots">
            <i />
            <i />
            <i />
            <span>your next good idea</span>
          </div>
          <div className="browser-demo">
            <aside />
            <section>
              <i />
              <i />
              <div>
                <b />
                <b />
              </div>
            </section>
          </div>
          <span className="cover-cursor">↖</span>
        </div>
      )}
      {memory.cover === "garden" && (
        <div className="cover-garden">
          <span className="stem" />
          <i />
          <i />
          <i />
          <i />
          <span className="garden-word">
            let ideas
            <br />
            <em>grow.</em>
          </span>
        </div>
      )}
      {memory.cover === "quote" && (
        <div className="cover-quote">
          <span>“</span>
          <p>
            {memory.source === "sample"
              ? "A little space for a bigger thought."
              : noun + ", remembered."}
          </p>
          <i>FILED UNDER CURIOSITY</i>
        </div>
      )}
      {memory.cover === "layers" && (
        <div className="cover-layers">
          <i />
          <i />
          <i />
          <span>
            little things,
            <br />
            <em>connected.</em>
          </span>
        </div>
      )}
      <span className="cover-number">
        TB / {memory.tags.length.toString().padStart(2, "0")}
      </span>
    </div>
  );
}

export function MemoryCard({
  memory,
  selected,
  onSelect,
  onOpen,
  onFavorite,
  onArchive,
  onTag,
  list = false,
}: {
  memory: Memory;
  selected: boolean;
  onSelect: () => void;
  onOpen: () => void;
  onFavorite: () => void;
  onArchive: () => void;
  onTag: (tag: string) => void;
  list?: boolean;
}) {
  const [menu, setMenu] = useState(false);
  const badge =
    memory.analysis === "on-device"
      ? "Gemini Nano · on device"
      : memory.analysis === "sample"
        ? "Sample summary"
        : memory.analysis === "excerpt"
          ? "Saved excerpt"
          : "Imported summary";
  return (
    <article
      className={`memory-card ${selected ? "is-selected" : ""} ${list ? "is-list" : ""}`}
      data-memory-id={memory.id}
    >
      <button
        className="cover-button"
        onClick={onOpen}
        aria-label={`Read ${memory.title}`}
      >
        <MemoryCover memory={memory} />
      </button>
      <button
        className={`card-select ${selected ? "checked" : ""}`}
        onClick={onSelect}
        role="checkbox"
        aria-checked={selected}
        aria-label={`Select ${memory.title}`}
      >
        {selected && <Check size={13} />}
      </button>
      <div className="card-body">
        <div className="card-source">
          <span className="source-glyph">
            {memory.kind === "documentation" ? (
              <Code2 size={12} />
            ) : memory.kind === "tool" ? (
              <span>↗</span>
            ) : (
              <FileText size={11} />
            )}
          </span>
          <span>{hostname(memory)}</span>
          <span className="card-kind">
            {memory.kind === "documentation" ? "docs" : memory.kind}
          </span>
        </div>
        <button className="card-title" onClick={onOpen}>
          {memory.title}
          <ArrowUpRight size={16} />
        </button>
        <p className="card-summary">{memory.summary}</p>
        <div className="card-tags">
          {memory.tags.slice(0, 3).map((tag) => (
            <button key={tag} onClick={() => onTag(tag)}>
              #{tag}
            </button>
          ))}
        </div>
        {(memory.readAt || memory.reminder) && (
          <div className="card-reading-status">
            {memory.readAt ? (
              <>
                <BookCheck size={11} />
                Read
              </>
            ) : (
              <>
                <Bell size={11} />
                Return {formatReminder(memory.reminder!.at)}
              </>
            )}
          </div>
        )}
        <div className="card-foot">
          <span
            className={`analysis-badge ${memory.analysis === "on-device" ? "real-ai" : ""}`}
            title={badge}
          >
            {memory.analysis === "on-device" ? (
              <Sparkles size={11} />
            ) : (
              <span className="tiny-dot" />
            )}
            {badge}
          </span>
          <div>
            <button
              className={`icon-button favorite-button ${memory.favorite ? "active" : ""}`}
              aria-label={`${memory.favorite ? "Unfavorite" : "Favorite"} ${memory.title}`}
              onClick={onFavorite}
            >
              <Heart
                size={15}
                fill={memory.favorite ? "currentColor" : "none"}
              />
            </button>
            <button
              className="icon-button"
              aria-label={`More options for ${memory.title}`}
              onClick={() => setMenu(!menu)}
              aria-expanded={menu}
            >
              <MoreHorizontal size={17} />
            </button>
          </div>
        </div>
        {menu && (
          <div className="card-menu">
            <button
              onClick={() => {
                setMenu(false);
                onOpen();
              }}
            >
              Read saved page
            </button>
            <button
              onClick={() => {
                setMenu(false);
                onArchive();
              }}
            >
              {memory.archived ? "Restore to memories" : "Move to archive"}
            </button>
            <button onClick={() => setMenu(false)}>Close menu</button>
          </div>
        )}
      </div>
    </article>
  );
}
