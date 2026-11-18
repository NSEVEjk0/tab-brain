import { useState } from "react";
import { Bell, CalendarPlus, Check, X } from "lucide-react";
import {
  downloadReminder,
  formatReminder,
  localDateInput,
  quickReminder,
  reminderFromInput,
} from "../reminders";
import { friendlyError } from "../ai";
import type { Memory } from "../types";

export function ReminderPanel({
  memory,
  onUpdate,
}: {
  memory: Memory;
  onUpdate: (memory: Memory) => Promise<void>;
}) {
  const [at, setAt] = useState(
    memory.reminder ? localDateInput(memory.reminder.at) : "",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  async function save(input: string) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const reminder = reminderFromInput(input);
      await onUpdate({
        ...memory,
        reminder,
        readAt: undefined,
        updatedAt: new Date().toISOString(),
      });
      setAt(localDateInput(reminder.at));
      setMessage("Your return visit is saved.");
    } catch (error) {
      setError(friendlyError(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="reminder-panel">
      <h3>
        <Bell size={15} />
        Come back to this page
      </h3>
      <p>
        {memory.reminder
          ? `Your reminder is set for ${formatReminder(memory.reminder.at)}.`
          : "Pick a time that gives you room to read it."}
      </p>
      <div className="reminder-shortcuts">
        {(["hour", "tomorrow", "week"] as const).map((kind, index) => (
          <button
            className="button ghost"
            key={kind}
            disabled={busy}
            onClick={() => void save(localDateInput(quickReminder(kind)))}
          >
            {["In one hour", "Tomorrow morning", "Next week"][index]}
          </button>
        ))}
      </div>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void save(at);
        }}
      >
        <label>
          Reminder date and time
          <input
            type="datetime-local"
            value={at}
            onChange={(event) => setAt(event.target.value)}
            disabled={busy}
            required
          />
        </label>
        <small>
          Times use {Intl.DateTimeFormat().resolvedOptions().timeZone}.
        </small>
        <button
          className="button secondary"
          type="submit"
          disabled={busy || !at}
        >
          <Check size={14} />
          {memory.reminder ? "Update reminder" : "Set reminder"}
        </button>
      </form>
      {memory.reminder && (
        <div className="reminder-actions">
          <button
            className="text-link"
            onClick={() => {
              try {
                downloadReminder(memory);
              } catch (error) {
                setError(friendlyError(error));
              }
            }}
          >
            <CalendarPlus size={14} />
            Add to calendar
          </button>
          <button
            className="text-link muted"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setError("");
              try {
                await onUpdate({
                  ...memory,
                  reminder: undefined,
                  updatedAt: new Date().toISOString(),
                });
                setAt("");
                setMessage("Reminder removed.");
              } catch (error) {
                setError(friendlyError(error));
              } finally {
                setBusy(false);
              }
            }}
          >
            <X size={13} />
            Remove reminder
          </button>
        </div>
      )}
      {message && (
        <p className="inline-success" role="status">
          {message}
        </p>
      )}
      {error && (
        <p className="inline-error" role="alert">
          {error}
        </p>
      )}
      <p className="reminder-note">
        Turn on notifications in Return visits, or add this reminder to your
        calendar.
      </p>
    </section>
  );
}
