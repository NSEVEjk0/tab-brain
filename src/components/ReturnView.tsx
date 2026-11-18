import { useState } from "react";
import {
  ArrowUpRight,
  Bell,
  BellOff,
  BookCheck,
  CalendarPlus,
  Clock3,
  LoaderCircle,
} from "lucide-react";
import type { Memory } from "../types";
import { isExtension } from "../constants";
import {
  downloadReminder,
  formatReminder,
  quickReminder,
  returnQueue,
} from "../reminders";
import { hostname } from "../library";
import { friendlyError } from "../ai";

export function ReturnView({
  memories,
  now,
  notifications,
  onNotifications,
  onOpen,
  onUpdate,
}: {
  memories: Memory[];
  now: number;
  notifications: boolean;
  onNotifications: (enabled: boolean) => Promise<void>;
  onOpen: (id: string) => void;
  onUpdate: (memory: Memory) => Promise<void>;
}) {
  const queue = returnQueue(memories, now);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [limit, setLimit] = useState(12);
  async function change(work: () => Promise<void>) {
    setError("");
    setBusy(true);
    try {
      await work();
    } catch (error) {
      setError(friendlyError(error));
    } finally {
      setBusy(false);
    }
  }
  function cards(items: Memory[], due = false) {
    return (
      <div className="return-grid">
        {items.map((memory) => (
          <article
            className={`return-card ${due ? "is-due" : ""}`}
            key={memory.id}
          >
            <div className="return-source">
              <span>{hostname(memory)}</span>
              {memory.reminder && (
                <span>
                  <Clock3 size={12} />
                  {formatReminder(memory.reminder.at)}
                </span>
              )}
            </div>
            <button className="return-title" onClick={() => onOpen(memory.id)}>
              {memory.title}
              <ArrowUpRight size={15} />
            </button>
            <p>{memory.notes || memory.summary}</p>
            <div className="return-card-actions">
              <button
                className="button secondary"
                onClick={() => onOpen(memory.id)}
              >
                {memory.reminder ? "Read saved page" : "Read or set a reminder"}
              </button>
              <button
                className="icon-button"
                aria-label={`Mark ${memory.title} as read`}
                disabled={busy}
                onClick={() =>
                  void change(() =>
                    onUpdate({
                      ...memory,
                      readAt: new Date().toISOString(),
                      reminder: undefined,
                      updatedAt: new Date().toISOString(),
                    }),
                  )
                }
              >
                <BookCheck size={17} />
              </button>
              {due && (
                <button
                  className="text-link"
                  disabled={busy}
                  onClick={() =>
                    void change(() =>
                      onUpdate({
                        ...memory,
                        reminder: {
                          at: quickReminder("tomorrow").toISOString(),
                        },
                        updatedAt: new Date().toISOString(),
                      }),
                    )
                  }
                >
                  Tomorrow
                </button>
              )}
              {memory.reminder && (
                <button
                  className="icon-button"
                  aria-label={`Add ${memory.title} to calendar`}
                  onClick={() => {
                    try {
                      downloadReminder(memory);
                    } catch (error) {
                      setError(friendlyError(error));
                    }
                  }}
                >
                  <CalendarPlus size={17} />
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
    );
  }
  return (
    <div className="return-view">
      <div className="page-title-row">
        <div>
          <span className="eyebrow">SAVE IT, THEN MAKE TIME FOR IT</span>
          <h1>Good ideas deserve a return visit.</h1>
          <p>
            Your reading list, the pages you planned to revisit, and a little
            nudge when they are ready.
          </p>
        </div>
        <span className="return-stamp">
          <Bell size={27} />
        </span>
      </div>
      <div className="notification-panel">
        <div>
          <strong>
            {notifications
              ? "Notifications are turned on."
              : "A reminder that reaches you."}
          </strong>
          <p>
            {isExtension
              ? "Chrome can remind you while the side panel is closed. Alerts may arrive later if the browser or computer is asleep."
              : "Browser alerts work while Tab Brain is open. Add a reminder to your calendar for an alert when this page is closed."}
          </p>
        </div>
        <button
          className="button secondary"
          disabled={busy}
          onClick={() => void change(() => onNotifications(!notifications))}
        >
          {busy ? (
            <LoaderCircle size={15} className="spin" />
          ) : notifications ? (
            <BellOff size={15} />
          ) : (
            <Bell size={15} />
          )}{" "}
          {notifications ? "Turn off notifications" : "Enable notifications"}
        </button>
      </div>
      {error && (
        <p className="inline-error" role="alert">
          {error}
        </p>
      )}
      <section className="return-section">
        <div className="section-small-heading">
          <h2>
            Ready for you <span>{queue.due.length}</span>
          </h2>
          <small>Reminders stay here until you read or reschedule them.</small>
        </div>
        {queue.due.length ? (
          cards(queue.due, true)
        ) : (
          <div className="return-empty">
            <Bell size={20} />
            <p>
              You are all caught up. Set a reminder on a saved page and it will
              appear here when it is time.
            </p>
          </div>
        )}
      </section>
      {queue.upcoming.length > 0 && (
        <section className="return-section">
          <div className="section-small-heading">
            <h2>
              Coming up <span>{queue.upcoming.length}</span>
            </h2>
          </div>
          {cards(queue.upcoming)}
        </section>
      )}
      <section className="return-section">
        <div className="section-small-heading">
          <h2>
            Still on your reading list <span>{queue.unread.length}</span>
          </h2>
        </div>
        {queue.unread.length ? (
          cards(queue.unread.slice(0, limit))
        ) : (
          <div className="return-empty">
            <BookCheck size={20} />
            <p>
              Everything has been read or has a reminder. Save something new
              when you find it.
            </p>
          </div>
        )}
        {queue.unread.length > limit && (
          <button
            className="button secondary return-more"
            onClick={() => setLimit((current) => current + 12)}
          >
            Show more pages
          </button>
        )}
      </section>
    </div>
  );
}
