import { useEffect, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Cloud,
  Download,
  FileText,
  LoaderCircle,
  LockKeyhole,
  Send,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { BrandMark } from "./Brand";
import { Modal } from "./Modal";
import { ModelBadge, ModelReceipt } from "./ModelBadge";
import { friendlyError, askCloud, localModelReady } from "../ai";
import {
  awaitingCloudApproval,
  cloudModelName,
  getAIStatus,
  idleAIStatus,
} from "../aiStatus";
import { answers as loadAnswers, putAnswer, recordCloudAttempt } from "../db";
import { MAX_CLOUD_SOURCES, previewCloud, rankMemories } from "../library";
import { openSource } from "../extension";
import type {
  AIConfig,
  Answer,
  CloudPreview,
  Memory,
  Settings,
} from "../types";

function CitedText({ text, answer }: { text: string; answer: Answer }) {
  const parts = text.split(/(\[\d+\])/g);
  return (
    <p className="answer-prose">
      {parts.map((part, index) => {
        const match = part.match(/^\[(\d+)\]$/);
        if (!match) return <span key={index}>{part}</span>;
        const source = answer.sources.find(
          (s) => s.number === Number(match[1]),
        );
        return source ? (
          <button
            key={index}
            className="inline-citation"
            aria-label={`Open source ${source.number}: ${source.title}`}
            title={source.title}
            onClick={() => void openSource(source.url)}
          >
            {source.number}
          </button>
        ) : null;
      })}
    </p>
  );
}
function downloadBrief(answer: Answer) {
  const text = `# ${answer.question}\n\n${answer.answer}\n\n${answer.unknowns.length ? "## Missing information\n\n" + answer.unknowns.map((x) => "- " + x).join("\n") + "\n\n" : ""}## Sources\n\n${answer.sources.map((s) => `[${s.number}] ${s.title}\n${s.url}\nCaptured: ${s.savedAt}\n`).join("\n")}\nGenerated: ${answer.at}\n`;
  const url = URL.createObjectURL(
    new Blob([text], { type: "text/markdown;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = "tab-brain-research-brief.md";
  link.click();
  URL.revokeObjectURL(url);
}

export function AskView({
  memories,
  selectedIds,
  config,
  onConnect,
  onLedger,
}: {
  memories: Memory[];
  selectedIds: string[];
  config?: AIConfig;
  onConnect: () => void;
  onLedger: (settings: Settings) => void;
}) {
  const [question, setQuestion] = useState("");
  const [history, setHistory] = useState<Answer[]>([]);
  const [reviewMemories, setReviewMemories] = useState<Memory[]>([]);
  const [reviewIds, setReviewIds] = useState<string[]>([]);
  const [preview, setPreview] = useState<CloudPreview>();
  const [error, setError] = useState("");
  const [reviewError, setReviewError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    loadAnswers()
      .then(setHistory)
      .catch((error) => setError(friendlyError(error)));
  }, []);
  useEffect(
    () => () => {
      if (getAIStatus().phase === "review") idleAIStatus(localModelReady());
    },
    [],
  );
  const selected = memories.filter(
    (m) => selectedIds.includes(m.id) && !m.archived,
  );
  function prepare(value = question, candidates = selected) {
    setError("");
    setReviewError("");
    try {
      const sources = candidates.length
        ? candidates.slice(0, MAX_CLOUD_SOURCES)
        : rankMemories(
            memories.filter((m) => !m.archived),
            value,
          ).slice(0, 4);
      if (!sources.length)
        throw new Error(
          "No saved sources matched. Try a topic from your library, or select a few memories first.",
        );
      const request = previewCloud(value, sources);
      setReviewMemories(sources);
      setReviewIds(sources.map((m) => m.id));
      setPreview(request);
      setQuestion(value);
      awaitingCloudApproval(config?.model);
    } catch (error) {
      setError(friendlyError(error));
    }
  }
  function toggle(id: string) {
    const ids = reviewIds.includes(id)
      ? reviewIds.filter((x) => x !== id)
      : [...reviewIds, id];
    setReviewIds(ids);
    setPreview(
      ids.length
        ? previewCloud(
            question,
            reviewMemories.filter((m) => ids.includes(m.id)),
          )
        : undefined,
    );
  }
  async function send() {
    if (!preview || !config || busy) return;
    const approved = structuredClone(preview);
    setBusy(true);
    setReviewError("");
    try {
      const ledger = await recordCloudAttempt(
        approved.pageContentBytes,
        approved.sources.length,
      );
      onLedger(ledger);
      const response = await askCloud(approved, config, approved.requestText);
      const answer: Answer = {
        id: crypto.randomUUID(),
        question: approved.question,
        ...response,
        sources: approved.sources,
        at: new Date().toISOString(),
        bytes: approved.pageContentBytes,
      };
      await putAnswer(answer);
      setHistory((items) => [answer, ...items]);
      setReviewMemories([]);
      setPreview(undefined);
      setQuestion("");
    } catch (error) {
      setReviewError(friendlyError(error));
    } finally {
      setBusy(false);
    }
  }
  const reviewing = reviewMemories.length > 0;
  function closeReview() {
    setReviewMemories([]);
    setPreview(undefined);
    idleAIStatus(localModelReady());
  }
  const localSummaries = memories.filter(
    (memory) => memory.analysis === "on-device",
  ).length;
  return (
    <div className="ask-view">
      <div className="page-title-row">
        <div>
          <h1>Ask my tabs</h1>
          <p>Compare saved pages and follow each citation to its source.</p>
        </div>
        <span className="status-pill cloud-status">
          <Cloud size={13} />
          {config ? "Firebase configured" : "Cloud setup needed"}
        </span>
      </div>
      <div
        className="hybrid-flow"
        aria-label="How your sources become an answer"
      >
        <div className="flow-device">
          <span>1</span>
          <strong>Save on your device</strong>
          <p>
            {localSummaries
              ? `${localSummaries} ${localSummaries === 1 ? "summary" : "summaries"} generated on device. Other sources keep their saved excerpts.`
              : "Readable text stays here. Gemini Nano can add summaries on supported devices."}
          </p>
        </div>
        <div className={reviewing ? "flow-active" : ""}>
          <span>2</span>
          <strong>Review the excerpts</strong>
          <p>Choose the exact source snippets you want to share.</p>
        </div>
        <div className={busy ? "flow-cloud flow-active" : "flow-cloud"}>
          <span>3</span>
          <strong>
            {config ? cloudModelName(config.model) : "Gemini"} in the cloud
          </strong>
          <p>Firebase sends your approved snippets for a cited answer.</p>
        </div>
      </div>
      <div className="ask-layout">
        <div className="ask-main">
          <div className="ask-welcome">
            <div className="ask-brand">
              <BrandMark />
            </div>
            <h2>Start with a question</h2>
            <p>
              Choose a question. We’ll find relevant memories on your device,
              then let you review every snippet before Gemini sees it.
            </p>
            <div className="question-suggestions">
              <button
                onClick={() =>
                  prepare(
                    "Compare the pros, cons, and pricing of these four tools.",
                    memories
                      .filter((m) => m.kind === "tool" && !m.archived)
                      .slice(0, 4),
                  )
                }
              >
                <span>Compare my research tools</span>
                <ArrowUpRight size={16} />
              </button>
              <button
                onClick={() =>
                  prepare(
                    "Which saved ideas help me build software that works offline?",
                  )
                }
              >
                <span>Find the ideas about offline work</span>
                <ArrowUpRight size={16} />
              </button>
              <button
                onClick={() =>
                  prepare(
                    "What practical design changes make an interface feel calmer?",
                  )
                }
              >
                <span>Connect my notes on calmer design</span>
                <ArrowUpRight size={16} />
              </button>
            </div>
          </div>
          {selected.length > 0 && (
            <div className="selected-sources-note">
              <Check size={15} />
              {selected.length} selected{" "}
              {selected.length === 1 ? "memory" : "memories"} will be used for
              your question
              {selected.length > MAX_CLOUD_SOURCES
                ? ` (first ${MAX_CLOUD_SOURCES})`
                : ""}
              .
            </div>
          )}
          <form
            className="ask-composer"
            onSubmit={(e) => {
              e.preventDefault();
              prepare();
            }}
          >
            <label className="sr-only" htmlFor="ask-question">
              Ask a question about your tabs
            </label>
            <textarea
              id="ask-question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Compare the tools I saved. What’s the best fit for me?"
              rows={2}
              maxLength={1200}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                  e.preventDefault();
                  prepare();
                }
              }}
            />
            <div className="composer-foot">
              <span>
                <LockKeyhole size={13} />
                Nothing is sent until you approve.
              </span>
              <button
                className="button dark"
                disabled={!question.trim()}
                type="submit"
              >
                Review sources <ArrowRight size={15} />
              </button>
            </div>
          </form>
          {error && (
            <p className="inline-error" role="alert">
              {error}
            </p>
          )}
          {history.length > 0 && (
            <div className="answer-history">
              <div className="section-small-heading">
                <h2>Your research briefs</h2>
                <span>Saved on this device</span>
              </div>
              {history.map((answer) => (
                <article className="answer-card" key={answer.id}>
                  <div className="answer-heading">
                    {answer.modelEvidence ? (
                      <ModelReceipt evidence={answer.modelEvidence} />
                    ) : (
                      <span>
                        <Sparkles size={16} />
                        Gemini · source-grounded answer
                      </span>
                    )}
                    <button
                      className="icon-button"
                      aria-label={`Download brief: ${answer.question}`}
                      onClick={() => downloadBrief(answer)}
                    >
                      <Download size={17} />
                    </button>
                  </div>
                  <h3>{answer.question}</h3>
                  <CitedText text={answer.answer} answer={answer} />
                  {answer.unknowns.length > 0 && (
                    <div className="answer-unknowns">
                      <strong>What the sources don’t tell us</strong>
                      {answer.unknowns.map((unknown, index) => (
                        <p key={index}>{unknown}</p>
                      ))}
                    </div>
                  )}
                  <div className="answer-sources">
                    {answer.sources.map((source) => (
                      <button
                        key={source.number}
                        onClick={() => void openSource(source.url)}
                      >
                        <span>{source.number}</span>
                        {source.title}
                        <ArrowUpRight size={12} />
                      </button>
                    ))}
                  </div>
                  <small>
                    {new Date(answer.at).toLocaleString()} ·{" "}
                    {answer.sources.length} approved sources
                    {answer.modelEvidence
                      ? ` · ${answer.modelEvidence.name}`
                      : ""}
                  </small>
                </article>
              ))}
            </div>
          )}
        </div>
        <aside className="ask-aside">
          <span className="eyebrow">A LITTLE TRUST GOES A LONG WAY</span>
          <h3>Answers with a paper trail.</h3>
          <div className="trust-step">
            <span>1</span>
            <div>
              <strong>Find locally</strong>
              <p>
                Your question searches saved titles, tags, summaries, and page
                text on your device.
              </p>
            </div>
          </div>
          <div className="trust-step">
            <span>2</span>
            <div>
              <strong>Review the small print</strong>
              <p>
                Only selected summaries and relevant excerpts go into the
                preview.
              </p>
            </div>
          </div>
          <div className="trust-step">
            <span>3</span>
            <div>
              <strong>Send with intention</strong>
              <p>
                You approve the exact snippets. Cloud Gemini answers with
                numbered source citations.
              </p>
            </div>
          </div>
          <div className="ask-privacy">
            <ShieldCheck size={20} />
            <p>
              Your whole library stays here. Every cloud request starts with
              your approval.
            </p>
          </div>
          {!config && (
            <button className="button secondary" onClick={onConnect}>
              Connect Firebase <ArrowUpRight size={14} />
            </button>
          )}
        </aside>
      </div>
      {reviewing && (
        <Modal
          title="A small preview before a big answer."
          eyebrow="YOU DECIDE WHAT LEAVES YOUR DEVICE"
          onClose={closeReview}
          wide
          busy={busy}
        >
          <div className="model-activity">
            <ModelBadge />
          </div>
          <div className="cloud-review-question">
            <Cloud size={21} />
            <div>
              <span>Your question</span>
              <strong>{question}</strong>
            </div>
          </div>
          <div className="review-summary">
            <span>
              <FileText size={15} />
              {reviewIds.length} selected{" "}
              {reviewIds.length === 1 ? "source" : "sources"}
            </span>
            <span>
              {(preview?.pageContentBytes ?? 0).toLocaleString()} page-content
              bytes
            </span>
            <span>
              <ShieldCheck size={14} />
              Whole pages stay local
            </span>
          </div>
          <div className="review-source-list">
            {reviewMemories.map((memory) => {
              const snippet = preview?.sources.find(
                (source) => source.memoryId === memory.id,
              );
              return (
                <section
                  className={`review-source ${reviewIds.includes(memory.id) ? "" : "excluded-source"}`}
                  key={memory.id}
                >
                  <label>
                    <input
                      type="checkbox"
                      checked={reviewIds.includes(memory.id)}
                      onChange={() => toggle(memory.id)}
                      disabled={busy}
                    />
                    <span>
                      <strong>{memory.title}</strong>
                      <small>
                        {memory.source === "sample"
                          ? "Authored sample page · "
                          : ""}
                        Captured {new Date(memory.savedAt).toLocaleDateString()}
                      </small>
                    </span>
                  </label>
                  {snippet && (
                    <div className="review-snippets">
                      <p>
                        <b>Summary</b>
                        {snippet.summary}
                      </p>
                      <details>
                        <summary>
                          Exact excerpts ({snippet.excerpts.length})
                        </summary>
                        {snippet.excerpts.map((text, index) => (
                          <blockquote key={index}>{text}</blockquote>
                        ))}
                        <code className="source-url">{snippet.url}</code>
                      </details>
                    </div>
                  )}
                </section>
              );
            })}
          </div>
          {preview && (
            <details className="payload-details">
              <summary>See the exact source payload</summary>
              <pre>{preview.requestText}</pre>
            </details>
          )}
          {!config && (
            <div className="review-connect">
              <LockKeyhole size={18} />
              <p>
                Connect Firebase to send this request. You can review sources
                now; no inference will run while AI is unconfigured.
              </p>
              <button
                className="text-link"
                onClick={() => {
                  setReviewMemories([]);
                  setPreview(undefined);
                  onConnect();
                }}
              >
                Open AI settings <ArrowUpRight size={14} />
              </button>
            </div>
          )}
          {reviewError && (
            <p className="inline-error" role="alert">
              {reviewError}
            </p>
          )}
          <div className="review-footer">
            <button
              className="button ghost"
              disabled={busy}
              onClick={closeReview}
            >
              <X size={15} />
              Keep it local
            </button>
            <button
              className="button dark"
              onClick={send}
              disabled={!config || !preview || busy}
            >
              {busy ? (
                <LoaderCircle size={16} className="spin" />
              ) : (
                <Send size={15} />
              )}{" "}
              {busy ? "Asking Gemini…" : "Approve & send to Gemini"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
