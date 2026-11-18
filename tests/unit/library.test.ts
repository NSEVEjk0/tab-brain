import { describe, expect, it } from "vitest";
import {
  canonicalUrl,
  createMemory,
  MAX_IMPORT_BYTES,
  parseAnswer,
  parseBackup,
  previewCloud,
  rankMemories,
  serializeBackup,
} from "../../src/library";
import { memory } from "./fixtures";

describe("durable browser recall", () => {
  it("finds a forgotten detail in original text even when the title and summary do not mention it", () => {
    const relevant = memory({
      id: "needle",
      title: "A field note",
      summary: "A few thoughts worth keeping.",
      tags: ["notes"],
      text: "The notebook supports full offline editing after the first download. Work remains available without an internet connection.",
    });
    const unrelated = memory({
      id: "other",
      text: "A guide to arranging visual design elements.",
    });
    expect(
      rankMemories(
        [unrelated, relevant],
        "find that article about offline editing",
      ).map((m) => m.id),
    ).toEqual(["needle"]);
  });
  it("preserves content-changing URL parameters while removing tracking and fragments", () => {
    expect(
      canonicalUrl(
        "https://example.com/read?lang=en&utm_source=email&version=2#section",
      ),
    ).toBe("https://example.com/read?lang=en&version=2");
    expect(canonicalUrl("https://example.com/read?version=3")).not.toBe(
      canonicalUrl("https://example.com/read?version=2"),
    );
  });
  it("saves an honest excerpt with bounded original text before any inference", () => {
    const created = createMemory({
      title: "Private reading",
      url: "https://example.com/read",
      text: "Original page detail. ".repeat(4000),
      tabId: 12,
      windowId: 3,
    });
    expect(created.analysis).toBe("excerpt");
    expect(created.source).toBe("tab");
    expect(created.text.length).toBeLessThanOrEqual(36_000);
    expect(() =>
      createMemory({
        title: "Empty",
        url: "https://example.com/",
        text: "short",
      }),
    ).toThrow("too little");
    expect(() =>
      createMemory({
        title: "Unsafe",
        url: "javascript:alert(1)",
        text: "Readable text on an unsafe URL that must never be opened.",
      }),
    ).toThrow("http");
  });
});
describe("an exact, minimized cloud preview", () => {
  it("includes only approved source snippets, keeps price evidence, and omits full pages", () => {
    const source = memory({
      title: "Fictional tool",
      text:
        "This is a synthetic product note. The example plan costs $9 per month. " +
        "Unrelated ordinary detail. ".repeat(200) +
        " NEVER_SEND_THIS_WHOLE_PAGE_MARKER",
      excerpts: ["The example plan costs $9 per month."],
    });
    const preview = previewCloud("Compare the pricing of this tool.", [source]);
    const payload = JSON.parse(preview.requestText);
    expect(payload.sources).toHaveLength(1);
    expect(payload.sources[0].excerpts.join(" ")).toContain("$9 per month");
    expect(payload.sources[0]).not.toHaveProperty("text");
    expect(preview.requestText).not.toContain(
      "NEVER_SEND_THIS_WHOLE_PAGE_MARKER",
    );
    expect(() => previewCloud("Question", [])).toThrow("at least one");
    expect(() =>
      previewCloud(
        "Question",
        Array.from({ length: 9 }, (_, i) => memory({ id: String(i) })),
      ),
    ).toThrow("up to 8");
  });
  it("measures UTF-8 bytes of the actual source payload", () => {
    const preview = previewCloud("What is useful?", [
      memory({ title: "A café note ☕" }),
    ]);
    expect(preview.pageContentBytes).toBe(
      new TextEncoder().encode(JSON.stringify(preview.sources)).byteLength,
    );
    expect(preview.pageContentBytes).toBeGreaterThan(
      JSON.stringify(preview.sources).length,
    );
  });
  it("rejects missing or invented citations instead of inventing links", () => {
    const preview = previewCloud("Question", [memory()]);
    expect(
      parseAnswer(
        '{"answer":"A supported detail [1].","unknowns":["Current price"]}',
        preview,
      ).answer,
    ).toContain("[1]");
    expect(() =>
      parseAnswer('{"answer":"An invented source [9]."}', preview),
    ).toThrow("cite");
    expect(() =>
      parseAnswer('{"answer":"No source at all."}', preview),
    ).toThrow("cite");
    expect(() => parseAnswer("not json", preview)).toThrow("unreadable");
  });
});
describe("portable backups", () => {
  it("excludes live tab identities and treats imported AI provenance honestly", () => {
    const raw = serializeBackup(
      [memory({ tabId: 12, windowId: 3, analysis: "on-device" })],
      [],
    );
    expect(raw).not.toContain("tabId");
    expect(raw).not.toContain("windowId");
    const restored = parseBackup(raw).memories[0];
    expect(restored.analysis).toBe("imported");
    expect(restored.tabId).toBeUndefined();
  });
  it("rejects dangerous URLs, duplicate IDs, malformed JSON, and oversized input", () => {
    expect(() => parseBackup("{broken")).toThrow("valid JSON");
    expect(() =>
      parseBackup(
        serializeBackup([memory({ url: "javascript:alert(1)" })], []),
      ),
    ).toThrow("http");
    expect(() =>
      parseBackup(serializeBackup([memory(), memory()], [])),
    ).toThrow("duplicate");
    expect(() => parseBackup("x".repeat(MAX_IMPORT_BYTES + 1))).toThrow(
      "too large",
    );
  });
});
