import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  Check,
  Download,
  Eye,
  LoaderCircle,
  Mail,
  Send,
  ShieldCheck,
} from "lucide-react";
import type { AIConfig, Collection, Memory } from "../types";
import type { EmailUser, SavedEmailPlan } from "../email";
import {
  EMAIL_SUMMARY_LENGTH,
  MAX_EMAIL_BOOKMARKS,
  renderEmailBrief,
  validateEmailPlan,
  type EmailPlanInput,
} from "../../shared/email";
import { isExtension, PUBLIC_SITE } from "../constants";
import { excerpt } from "../library";

const enabled = import.meta.env.VITE_EMAIL_SERVICE_ENABLED === "true";
const sessionKey = "tab-brain-email-connected";
type Client = typeof import("../email");

export function EmailsView({
  memories,
  collections,
  config,
}: {
  memories: Memory[];
  collections: Collection[];
  config?: AIConfig;
}) {
  const [collectionId, setCollectionId] = useState("");
  const [unread, setUnread] = useState(false);
  const [selected, setSelected] = useState<string[]>(() =>
    memories
      .filter((memory) => !memory.archived && memory.source !== "sample")
      .slice(0, MAX_EMAIL_BOOKMARKS)
      .map((memory) => memory.id),
  );
  const [frequency, setFrequency] = useState<"daily" | "weekly">("weekly");
  const [hour, setHour] = useState(8);
  const [weekday, setWeekday] = useState(1);
  const [timeZone, setTimeZone] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone,
  );
  const [summaries, setSummaries] = useState(true);
  const [reminderEmails, setReminderEmails] = useState(false);
  const [preview, setPreview] = useState<EmailPlanInput>();
  const [consent, setConsent] = useState(false);
  const [user, setUser] = useState<EmailUser | null>(null);
  const [saved, setSaved] = useState<SavedEmailPlan | null>(null);
  const [client, setClient] = useState<Client>();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const eligible = memories.filter(
    (memory) =>
      !memory.archived &&
      memory.source !== "sample" &&
      (!unread || !memory.readAt) &&
      (!collectionId || memory.collectionIds.includes(collectionId)),
  );
  const chosen = eligible.filter((memory) => selected.includes(memory.id));
  useEffect(() => {
    if (!enabled || isExtension || !config) return;
    let active = true;
    let unsubscribe: (() => void) | undefined;
    // Loading a local SDK module does not initialize Firebase or share the library.
    void import("../email")
      .then((module) => {
        if (!active) return;
        setClient(module);
        if (localStorage.getItem(sessionKey) !== config.firebase.projectId)
          return;
        unsubscribe = module.watchEmailUser(config, (account) => {
          if (!active) return;
          setUser(account);
          if (account)
            void module
              .loadEmailPlan(config)
              .then((plan) => {
                if (active) setSaved(plan);
              })
              .catch((error) => {
                if (active) setError(module.emailError(error));
              });
        });
      })
      .catch(() => {
        if (active)
          setError(
            "Email settings could not be loaded. Reload the page to try again.",
          );
      });
    return () => {
      active = false;
      unsubscribe?.();
    };
  }, [config?.firebase.projectId]);
  function changed() {
    setPreview(undefined);
    setConsent(false);
    setMessage("");
  }
  async function work(
    task: (module: Client, configuration: AIConfig) => Promise<void>,
  ) {
    if (!config) {
      setError("Connect Firebase in AI settings before setting up delivery.");
      return;
    }
    setBusy(true);
    setError("");
    setMessage("");
    let module = client;
    try {
      module ??= await import("../email");
      setClient(module);
      await task(module, config);
    } catch (error) {
      setError(
        module?.emailError(error) ??
          "Email settings could not be loaded. Reload the page to try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  function prepare() {
    setError("");
    setMessage("");
    try {
      const input = validateEmailPlan({
        frequency,
        hour,
        weekday,
        timeZone,
        includeSummaries: summaries,
        reminderEmails,
        consent: true,
        bookmarks: chosen.map((memory) => ({
          id: memory.id,
          title: memory.title,
          url: memory.url,
          savedAt: memory.savedAt,
          ...(summaries && memory.summary
            ? { summary: excerpt(memory.summary, EMAIL_SUMMARY_LENGTH - 1) }
            : {}),
          ...(reminderEmails && memory.reminder
            ? { reminderAt: memory.reminder.at }
            : {}),
        })),
      });
      setPreview(input);
      setConsent(false);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Choose a bookmark list for your brief.",
      );
    }
  }
  function download() {
    if (!preview) return;
    const brief = renderEmailBrief(preview.bookmarks, {
      includeSummaries: preview.includeSummaries,
      workspaceUrl: PUBLIC_SITE,
    });
    const url = URL.createObjectURL(
      new Blob([brief.html], { type: "text/html;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "tab-brain-reading-brief.html";
    link.click();
    URL.revokeObjectURL(url);
    setMessage("Your reading brief was downloaded.");
  }
  return (
    <section className="settings-panel email-panel" id="email-briefs">
      <div className="panel-heading">
        <span className="setting-icon">
          <Mail size={20} />
        </span>
        <div>
          <h2>A reading brief in your inbox</h2>
          <p>Choose a few pages, then make a little time for them.</p>
        </div>
        <span className={`status-pill ${saved?.enabled ? "configured" : ""}`}>
          {saved?.enabled
            ? "Delivery scheduled"
            : enabled
              ? "Not scheduled"
              : "Delivery setup pending"}
        </span>
      </div>
      <p className="email-intro">
        A daily or weekly email can bring your bookmarks back into view. You
        choose the titles, links, and short summaries it contains. Your private
        notes and full page text stay here.
      </p>
      {isExtension ? (
        <div className="email-setup-note">
          <p>
            Email setup is available in the web companion. Export your library
            here, open the website, and import the backup before choosing the
            bookmarks for your brief.
          </p>
          <a
            className="button secondary"
            href={PUBLIC_SITE + "/#settings"}
            target="_blank"
            rel="noreferrer"
          >
            Open the web companion <ArrowUpRight size={14} />
          </a>
        </div>
      ) : (
        <>
          <div className="email-account">
            <div>
              <strong>
                {user
                  ? "Your delivery address is verified."
                  : "Use Google to verify your delivery address."}
              </strong>
              <p>
                {user?.email ??
                  "Sign in when you want scheduled delivery. Previewing a brief works without an account."}
              </p>
            </div>
            {user ? (
              <button
                className="button ghost"
                disabled={busy}
                onClick={() =>
                  void work(async (module, configuration) => {
                    await module.signOutEmail(configuration);
                    localStorage.removeItem(sessionKey);
                    setUser(null);
                    setSaved(null);
                    setMessage(
                      "Signed out of email settings. Use the unsubscribe link in a delivered email if you want to stop an existing schedule.",
                    );
                  })
                }
              >
                Sign out
              </button>
            ) : (
              <button
                className="button secondary"
                disabled={busy || !enabled || !config}
                onClick={() =>
                  void work(async (module, configuration) => {
                    const account = await module.connectEmail(configuration);
                    localStorage.setItem(
                      sessionKey,
                      configuration.firebase.projectId,
                    );
                    setUser(account);
                    setSaved(await module.loadEmailPlan(configuration));
                  })
                }
              >
                <ShieldCheck size={14} />
                Connect email delivery
              </button>
            )}
          </div>
          {!enabled && (
            <p className="email-setup-note">
              Scheduled delivery is not available on this deployment yet. You
              can preview and download a brief now.
            </p>
          )}
          {saved && (
            <div className="saved-email-plan">
              <strong>
                {saved.enabled
                  ? "Your email plan is running."
                  : "Your email plan is paused."}
              </strong>
              <p>
                {saved.bookmarks.length} approved bookmarks · {saved.frequency}{" "}
                at {String(saved.hour).padStart(2, "0")}:00 in {saved.timeZone}
                {saved.enabled
                  ? ` · next brief ${new Date(saved.nextDigestAt).toLocaleString()}`
                  : ""}
              </p>
              {saved.lastError && (
                <p role="alert" className="inline-error">
                  {saved.lastError}
                </p>
              )}
              <div className="button-row">
                <button
                  className="button secondary"
                  disabled={busy || !saved.enabled}
                  onClick={() =>
                    void work(async (module, configuration) => {
                      const result = await module.sendEmailNow(configuration);
                      setSaved(await module.loadEmailPlan(configuration));
                      setMessage(
                        result === "sent"
                          ? "The email provider accepted your brief. Check your inbox and spam folder."
                          : "Delivery is queued or waiting for the hourly limit. Refresh these settings after the next scheduled run.",
                      );
                    })
                  }
                >
                  <Send size={14} />
                  Send one now
                </button>
                <button
                  className="button ghost"
                  disabled={busy}
                  onClick={() =>
                    void work(async (module, configuration) => {
                      await module.stopEmailPlan(configuration);
                      setSaved(null);
                      setMessage(
                        "Email deliveries stopped. The approved bookmark copy and schedule were removed.",
                      );
                    })
                  }
                >
                  Stop emails and remove the plan
                </button>
              </div>
            </div>
          )}
          <div className="email-preferences">
            <div className="form-grid">
              <label>
                Which bookmarks?
                <select
                  value={collectionId}
                  onChange={(event) => {
                    setCollectionId(event.target.value);
                    changed();
                  }}
                >
                  <option value="">All your bookmarks</option>
                  {collections.map((collection) => (
                    <option value={collection.id} key={collection.id}>
                      {collection.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                How often?
                <select
                  value={frequency}
                  onChange={(event) => {
                    setFrequency(event.target.value as "daily" | "weekly");
                    changed();
                  }}
                >
                  <option value="weekly">Weekly</option>
                  <option value="daily">Daily</option>
                </select>
              </label>
            </div>
            <div className="form-grid">
              <label>
                Delivery time
                <select
                  value={hour}
                  onChange={(event) => {
                    setHour(Number(event.target.value));
                    changed();
                  }}
                >
                  {Array.from({ length: 24 }, (_, hour) => (
                    <option value={hour} key={hour}>
                      {String(hour).padStart(2, "0")}:00
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Time zone
                <input
                  value={timeZone}
                  onChange={(event) => {
                    setTimeZone(event.target.value);
                    changed();
                  }}
                  placeholder="Africa/Lagos"
                />
              </label>
            </div>
            {frequency === "weekly" && (
              <label>
                Delivery day
                <select
                  value={weekday}
                  onChange={(event) => {
                    setWeekday(Number(event.target.value));
                    changed();
                  }}
                >
                  {[
                    "Sunday",
                    "Monday",
                    "Tuesday",
                    "Wednesday",
                    "Thursday",
                    "Friday",
                    "Saturday",
                  ].map((day, index) => (
                    <option key={day} value={index}>
                      {day}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <div className="email-choice-row">
              <label>
                <input
                  type="checkbox"
                  checked={unread}
                  onChange={(event) => {
                    setUnread(event.target.checked);
                    changed();
                  }}
                />
                <span>Only pages I have not read</span>
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={summaries}
                  onChange={(event) => {
                    setSummaries(event.target.checked);
                    changed();
                  }}
                />
                <span>Include the saved short summaries</span>
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={reminderEmails}
                  onChange={(event) => {
                    setReminderEmails(event.target.checked);
                    changed();
                  }}
                />
                <span>Email me when these bookmark reminders are due</span>
              </label>
            </div>
          </div>
          <div className="email-bookmark-head">
            <strong>
              {chosen.length} {chosen.length === 1 ? "bookmark" : "bookmarks"}{" "}
              selected
            </strong>
            <button
              className="text-link"
              onClick={() => {
                setSelected(
                  chosen.length ===
                    Math.min(eligible.length, MAX_EMAIL_BOOKMARKS)
                    ? []
                    : eligible
                        .slice(0, MAX_EMAIL_BOOKMARKS)
                        .map((memory) => memory.id),
                );
                changed();
              }}
            >
              {chosen.length ===
                Math.min(eligible.length, MAX_EMAIL_BOOKMARKS) && chosen.length
                ? "Deselect all"
                : "Select all"}
            </button>
          </div>
          {eligible.length ? (
            <div className="email-bookmark-list">
              {eligible.map((memory) => (
                <label key={memory.id}>
                  <input
                    type="checkbox"
                    checked={selected.includes(memory.id)}
                    disabled={
                      !selected.includes(memory.id) &&
                      chosen.length >= MAX_EMAIL_BOOKMARKS
                    }
                    onChange={() => {
                      setSelected((ids) =>
                        ids.includes(memory.id)
                          ? ids.filter((id) => id !== memory.id)
                          : [...ids, memory.id],
                      );
                      changed();
                    }}
                  />
                  <span>
                    <strong>{memory.title}</strong>
                    <small>
                      {new URL(memory.url).hostname}
                      {memory.reminder && reminderEmails
                        ? " · reminder included"
                        : ""}
                    </small>
                  </span>
                </label>
              ))}
            </div>
          ) : (
            <div className="email-empty">
              Save one of your own pages to build a brief. Authored sample pages
              are excluded from email delivery.
            </div>
          )}
          <p className="email-limit">
            You can include up to {MAX_EMAIL_BOOKMARKS} bookmarks. Preview and
            save again after adding pages, marking them read, or changing their
            reminder times.
          </p>
          <button
            className="button secondary"
            disabled={!chosen.length || busy}
            onClick={prepare}
          >
            <Eye size={14} />
            Preview my email brief
          </button>
          {preview && (
            <div className="email-preview">
              <div className="section-small-heading">
                <h3>Your email preview</h3>
                <span>
                  {preview.bookmarks.length} bookmarks ·{" "}
                  {new TextEncoder()
                    .encode(JSON.stringify(preview))
                    .byteLength.toLocaleString()}{" "}
                  bytes
                </span>
              </div>
              <iframe
                title="Your reading brief preview"
                sandbox=""
                srcDoc={
                  renderEmailBrief(preview.bookmarks, {
                    includeSummaries: preview.includeSummaries,
                    workspaceUrl: PUBLIC_SITE,
                  }).html
                }
              />
              <details className="payload-details">
                <summary>See the exact bookmark copy</summary>
                <pre>{JSON.stringify({ ...preview, consent }, null, 2)}</pre>
              </details>
              <label className="email-consent">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(event) => setConsent(event.target.checked)}
                />
                <span>
                  I approve sharing this bookmark copy with Firebase and the
                  email provider for my scheduled brief
                  {preview.reminderEmails ? " and reminder emails" : ""}.
                </span>
              </label>
              <div className="button-row">
                <button className="button secondary" onClick={download}>
                  <Download size={14} />
                  Download this brief
                </button>
                <button
                  className="button dark"
                  disabled={
                    busy ||
                    !consent ||
                    !user?.emailVerified ||
                    !enabled ||
                    !config
                  }
                  onClick={() =>
                    void work(async (module, configuration) => {
                      setSaved(
                        await module.saveEmailPlan(
                          configuration,
                          structuredClone(preview),
                        ),
                      );
                      setPreview(undefined);
                      setConsent(false);
                      setMessage(
                        "Your delivery schedule and approved bookmarks were saved.",
                      );
                    })
                  }
                >
                  {busy ? (
                    <LoaderCircle size={14} className="spin" />
                  ) : (
                    <Check size={14} />
                  )}{" "}
                  {saved ? "Update email plan" : "Turn on email briefs"}
                </button>
              </div>
              <p className="email-limit">
                Scheduled emails use this approved copy, even when the app is
                closed. Deliveries run every 15 minutes, and no more than once
                an hour per account.
              </p>
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
        </>
      )}
    </section>
  );
}
