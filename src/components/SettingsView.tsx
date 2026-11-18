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
import { friendlyError, initializeLocal } from "../ai";
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
  onLocalReady,
}: {
  settings: Settings;
  memories: Memory[];
  collections: Collection[];
  sampleCount: number;
  onSave: (config?: AIConfig) => Promise<void>;
  onExport: () => void;
  onImport: () => void;
  onClearSamples: () => Promise<void>;
  onLocalReady: () => void;
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
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [confirmClear, setConfirmClear] = useState(false);
  async function save(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");
    try {
      const config = validateAIConfig(json, mode, siteKey, model);
      if (mode === "debug" && !token.trim())
        throw new Error("Enter a registered App Check development token.");
      if (mode === "debug")
        sessionStorage.setItem(APP_CHECK_SESSION_KEY, token.trim());
      else sessionStorage.removeItem(APP_CHECK_SESSION_KEY);
      await onSave(config);
      setMessage(
        "Connection settings saved on this device. Enable the local model below, or review a source question to verify cloud inference.",
      );
    } catch (error) {
      setError(friendlyError(error));
    }
  }
  async function enable() {
    if (!settings.ai) return;
    setBusy(true);
    setError("");
    setMessage("");
    setProgress(0);
    try {
      await initializeLocal(settings.ai, setProgress);
      onLocalReady();
      setMessage(
        "The on-device model is ready in this browser. New page summaries can now run locally.",
      );
    } catch (error) {
      setError(friendlyError(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="settings-view">
      <div className="page-title-row">
        <div>
          <span className="eyebrow">MAKE YOURSELF AT HOME</span>
          <h1>Your space, your rules.</h1>
          <p>Keep your memory local. Connect AI when you’re ready.</p>
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
            <h2>Connect your AI</h2>
            <p>Local summaries and cloud answers use Firebase AI Logic.</p>
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
              Save the configuration below. On compatible desktop Chrome, enable
              the local model after a click, then try a real capture.
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
            <button className="button dark" type="submit">
              <Check size={16} />
              Save connection
            </button>
            {settings.ai && (
              <button
                className="button ghost"
                type="button"
                onClick={async () => {
                  sessionStorage.removeItem(APP_CHECK_SESSION_KEY);
                  await onSave(undefined);
                  setJson("");
                  setToken("");
                  setMessage(
                    "AI connection removed. Your saved memories are kept.",
                  );
                }}
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
          <h2>A model on your device</h2>
          <p>
            On compatible desktop Chrome, download and initialize Gemini Nano.
            Local capture uses the device only and never falls back to cloud.
          </p>
          <button
            className="button secondary"
            onClick={enable}
            disabled={!settings.ai || busy}
          >
            {busy ? (
              <LoaderCircle size={16} className="spin" />
            ) : (
              <HardDrive size={16} />
            )}{" "}
            {busy
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
