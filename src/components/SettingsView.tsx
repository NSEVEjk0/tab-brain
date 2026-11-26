import { useState } from "react";
import {
  ArrowUpRight,
  Check,
  Cloud,
  Download,
  HardDrive,
  KeyRound,
  LoaderCircle,
  LockKeyhole,
  ShieldCheck,
  Upload,
} from "lucide-react";
import { APP_CHECK_SESSION_KEY, isExtension } from "../constants";
import { friendlyError, initializeLocal, verifyConnection } from "../ai";
import { appCheckNeedsReload } from "../appCheck";
import { validateAIConfig } from "../library";
import {
  DEFAULT_CLOUD_MODEL,
  FIREBASE_WEB_CONFIG,
  hostedAIConfig,
} from "../firebaseConfig";
import { ModelBadge } from "./ModelBadge";
import { EmailsView } from "./EmailsView";
import type { AIConfig, Collection, Memory, Settings } from "../types";

export function SettingsView({
  settings,
  memories,
  collections,
  sampleCount,
  onSave,
  onExport,
  onImport,
  onClearSamples,
}: {
  settings: Settings;
  memories: Memory[];
  collections: Collection[];
  sampleCount: number;
  onSave: (config?: AIConfig, debugToken?: string) => Promise<void>;
  onExport: () => void;
  onImport: () => void;
  onClearSamples: () => Promise<void>;
}) {
  const defaultConfig = hostedAIConfig();
  const [json, setJson] = useState(
    JSON.stringify(settings.ai?.firebase ?? FIREBASE_WEB_CONFIG, null, 2),
  );
  const [mode, setMode] = useState<AIConfig["appCheckMode"]>(
    settings.ai?.appCheckMode ?? (isExtension ? "debug" : "enterprise"),
  );
  const [siteKey, setSiteKey] = useState(
    settings.ai?.siteKey ?? defaultConfig?.siteKey ?? "",
  );
  const [token, setToken] = useState(
    sessionStorage.getItem(APP_CHECK_SESSION_KEY) ?? "",
  );
  const [model, setModel] = useState(settings.ai?.model ?? DEFAULT_CLOUD_MODEL);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<"local" | "verify" | "save">();
  const [progress, setProgress] = useState(0);
  const [confirmClear, setConfirmClear] = useState(false);
  async function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy("save");
    setError("");
    setMessage("");
    try {
      const config = validateAIConfig(json, mode, siteKey, model);
      const debugToken = mode === "debug" ? token.trim() : "";
      if (mode === "debug" && !debugToken)
        throw new Error("Enter a registered development token from Firebase.");
      await onSave(config, debugToken);
      if (appCheckNeedsReload(config, debugToken)) {
        location.reload();
        return;
      }
      setMessage(
        "Connection saved. Choose Verify connection to test it.",
      );
    } catch (error) {
      setError(friendlyError(error));
    } finally {
      setBusy(undefined);
    }
  }
  async function disconnect() {
    setBusy("save");
    setError("");
    setMessage("");
    try {
      await onSave(undefined);
      setToken("");
      setMessage("Cloud connection removed.");
    } catch (error) {
      setError(friendlyError(error));
    } finally {
      setBusy(undefined);
    }
  }
  async function enable() {
    setBusy("local");
    setError("");
    setMessage("");
    setProgress(0);
    try {
      await initializeLocal(setProgress);
      setMessage(
        "The on-device model is ready in this browser. New page summaries can now run locally.",
      );
    } catch (error) {
      setError(friendlyError(error));
    } finally {
      setBusy(undefined);
    }
  }
  async function verify() {
    if (!settings.ai) return;
    setBusy("verify");
    setError("");
    setMessage("");
    try {
      await verifyConnection(settings.ai);
      setMessage(
        "Firebase verified this browser. You can now approve a cloud question to test the model.",
      );
    } catch (error) {
      setError(friendlyError(error));
    } finally {
      setBusy(undefined);
    }
  }
  return (
    <div className="settings-view">
      <div className="page-title-row">
        <div>
          <span className="eyebrow">MAKE YOURSELF AT HOME</span>
          <h1>Your space, your rules.</h1>
          <p>Manage your local library and cloud connection.</p>
        </div>
        <div className="title-stamp">
          <ShieldCheck size={25} />
          <span>
            Private
            <br />
            by design
          </span>
        </div>
      </div>
      <div className="model-activity">
        <ModelBadge />
      </div>
      <section className="settings-panel connection-panel">
        <div className="panel-heading">
          <span className="setting-icon">
            <Cloud size={20} />
          </span>
          <div>
            <h2>Connect Firebase for cloud comparisons</h2>
            <p>App Check verifies the browser before approved excerpts go to Gemini.</p>
          </div>
          <span className={`status-pill ${settings.ai ? "configured" : ""}`}>
            {settings.ai ? "Configuration saved" : "Setup needed"}
          </span>
        </div>
        <div className="setup-note">
          <LockKeyhole size={17} />
          <p>
            Page content stays on this device until you approve a cloud request.
            The hosted app and extension have separate libraries and connection
            settings.
          </p>
        </div>
        <details className="setup-guide" open={!settings.ai}>
          <summary>
            A quick setup guide <ArrowUpRight size={14} />
          </summary>
          <ol>
            <li>
              Open your{" "}
              <a
                href="https://console.firebase.google.com/"
                target="_blank"
                rel="noreferrer"
              >
                Firebase project
              </a>
              , register a Web app, and copy its configuration as JSON.
            </li>
            <li>
              Enable <strong>Firebase AI Logic</strong> with the Gemini
              Developer API, and enable App Check enforcement for AI Logic.
            </li>
            <li>
              Use reCAPTCHA Enterprise for the hosted web app. For a private
              extension test, register a development token in Firebase App
              Check.
            </li>
            <li>
              Save the configuration below, then verify the connection. Tab Brain
              may reload to apply a change to browser verification.
            </li>
          </ol>
          <a
            className="text-link"
            href="https://firebase.google.com/docs/ai-logic/hybrid/web/get-started"
            target="_blank"
            rel="noreferrer"
          >
            Official Firebase setup instructions <ArrowUpRight size={14} />
          </a>
        </details>
        <form onSubmit={save} className="settings-form">
          <label>
            Firebase Web app configuration
            <textarea
              aria-label="Firebase Web app configuration"
              value={json}
              onChange={(e) => setJson(e.target.value)}
              spellCheck={false}
              rows={6}
              placeholder={
                '{\n  "apiKey": "YOUR_WEB_APP_KEY",\n  "projectId": "your-project-id",\n  "appId": "YOUR_WEB_APP_ID"\n}'
              }
            />
          </label>
          <div className="form-grid">
            <label>
              App Check verification
              <select
                value={mode}
                onChange={(e) =>
                  setMode(e.target.value as AIConfig["appCheckMode"])
                }
              >
                <option value="enterprise" disabled={isExtension}>
                  reCAPTCHA Enterprise · web
                </option>
                <option value="debug">
                  Registered development token · private test
                </option>
              </select>
            </label>
            <label>
              Cloud model
              <input
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="gemini-3.5-flash-lite"
              />
            </label>
          </div>
          {mode === "enterprise" ? (
            <label>
              reCAPTCHA Enterprise site key
              <input
                value={siteKey}
                onChange={(e) => setSiteKey(e.target.value)}
                placeholder="Site key registered for this website"
              />
            </label>
          ) : (
            <label>
              <span>
                <KeyRound size={14} /> App Check development token
              </span>
              <input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                autoComplete="off"
                placeholder="Private token registered in the Firebase console"
              />
              <small>
                Kept for this browser session. Excluded from backups and
                downloads.
              </small>
            </label>
          )}
          <div className="form-actions">
            <button
              className="button dark"
              type="submit"
              disabled={Boolean(busy)}
            >
              <Check size={16} />
              Save connection
            </button>
            {settings.ai && (
              <button
                className="button secondary"
                type="button"
                disabled={Boolean(busy)}
                onClick={verify}
              >
                {busy === "verify" ? (
                  <LoaderCircle size={16} className="spin" />
                ) : (
                  <ShieldCheck size={16} />
                )}
                {busy === "verify"
                  ? "Verifying connection…"
                  : "Verify connection"}
              </button>
            )}
            {settings.ai && (
              <button
                className="button ghost"
                type="button"
                disabled={Boolean(busy)}
                onClick={disconnect}
              >
                Disconnect
              </button>
            )}
          </div>
        </form>
        {error && (
          <p className="inline-error" role="alert">
            {error}
          </p>
        )}
        {message && (
          <p className="inline-success" role="status">
            {message}
          </p>
        )}
      </section>
      <div className="settings-pair">
        <section className="settings-panel">
          <span className="setting-icon green">
            <HardDrive size={22} />
          </span>
          <h2>Summaries on your device</h2>
          <p>
            On supported desktop Chrome, enable Gemini Nano to summarize saved
            pages on this device.
          </p>
          <button
            className="button secondary"
            onClick={enable}
            disabled={Boolean(busy)}
          >
            {busy === "local" ? (
              <LoaderCircle size={16} className="spin" />
            ) : (
              <HardDrive size={16} />
            )}{" "}
            {busy === "local"
              ? `Preparing model${progress ? ` · ${Math.round(progress * 100)}%` : "…"}`
              : "Enable on-device AI"}
          </button>
          <a
            className="text-link"
            href="https://developer.chrome.com/docs/ai/get-started"
            target="_blank"
            rel="noreferrer"
          >
            Check Chrome and hardware support <ArrowUpRight size={13} />
          </a>
        </section>
        <section className="settings-panel">
          <span className="setting-icon">
            <Download size={22} />
          </span>
          <h2>A portable little library</h2>
          <p>
            Back up your sources, text, tags, and collections. Import them into
            another browser or the extension whenever you need.
          </p>
          <div className="button-row">
            <button className="button secondary" onClick={onExport}>
              <Download size={15} />
              Export backup
            </button>
            <button className="button ghost" onClick={onImport}>
              <Upload size={15} />
              Import backup
            </button>
          </div>
          <small>
            Connection settings, App Check tokens, and live tab IDs stay out of
            backups.
          </small>
        </section>
      </div>
      <section className="settings-panel sample-settings">
        <div>
          <h2>Make room for your own ideas</h2>
          <p>
            {sampleCount
              ? `${sampleCount} authored example pages are in this library. Their summaries and tool prices are sample data.`
              : "The sample pages have been removed. Your own memories are still here."}
          </p>
        </div>
        {sampleCount > 0 &&
          (confirmClear ? (
            <div className="button-row">
              <button
                className="button danger"
                onClick={async () => {
                  await onClearSamples();
                  setConfirmClear(false);
                }}
              >
                Remove sample pages
              </button>
              <button
                className="button ghost"
                onClick={() => setConfirmClear(false)}
              >
                Keep them
              </button>
            </div>
          ) : (
            <button
              className="button ghost"
              onClick={() => setConfirmClear(true)}
            >
              Remove examples
            </button>
          ))}
      </section>
      <EmailsView
        memories={memories}
        collections={collections}
        config={settings.ai ?? defaultConfig}
      />
      <p className="settings-footer">
        <ShieldCheck size={15} /> Your library stays on this device. AI requests
        and email copies need your approval. Browser storage can be cleared;
        keep a backup of work you care about.
      </p>
    </div>
  );
}
