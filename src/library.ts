import type {
  AIConfig,
  CloudPreview,
  ExtractedPage,
  Memory,
  SourceSnippet,
} from "./types";

const stopWords = new Set(
  "a an the and or for with to of in on is it this that these those i my me we you your our find show tell what which where how when about was were from by at as be been has have had can could would should saved page article tutorial thing today please read than into use using do does did".split(
    " ",
  ),
);
export const MAX_PAGE_TEXT = 36_000;
export const MAX_IMPORT_BYTES = 12 * 1024 * 1024;
export const MAX_CLOUD_SOURCES = 8;

export function normalize(text: string) {
  return text
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}
export function words(text: string) {
  return (normalize(text).match(/[a-z0-9][a-z0-9+#.-]*/g) ?? []).filter(
    (w) => w.length > 1 && !stopWords.has(w),
  );
}
export function safeUrl(value: string): string {
  const parsed = new URL(value);
  if (
    !["https:", "http:"].includes(parsed.protocol) ||
    parsed.username ||
    parsed.password
  )
    throw new Error(
      "Use an http or https page URL without embedded credentials.",
    );
  return parsed.href;
}
export function canonicalUrl(value: string): string {
  const url = new URL(safeUrl(value));
  url.hash = "";
  for (const key of [...url.searchParams.keys()])
    if (/^(utm_|fbclid|gclid|mc_)/i.test(key)) url.searchParams.delete(key);
  url.searchParams.sort();
  return url.href;
}
export function hostname(memory: Pick<Memory, "url" | "source">): string {
  if (memory.source === "sample") return "Field notes · sample";
  try {
    return new URL(memory.url).hostname.replace(/^www\./, "");
  } catch {
    return "Saved page";
  }
}
export function sentences(text: string): string[] {
  return (
    text.replace(/\s+/g, " ").match(/[^.!?]+(?:[.!?]+(?:\s|$)|$)/g) ?? [text]
  )
    .map((x) => x.trim())
    .filter(Boolean);
}
export function excerpt(text: string, size = 350): string {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (cleaned.length <= size) return cleaned;
  return cleaned.slice(0, size).replace(/\s+\S*$/, "") + "…";
}
export function suggestedTags(text: string): string[] {
  const counts = new Map<string, number>();
  for (const w of words(text))
    if (w.length > 3 && !/^\d/.test(w)) counts.set(w, (counts.get(w) ?? 0) + 1);
  return [...counts]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 3)
    .map(([word]) => word);
}
export function createMemory(page: ExtractedPage, existing?: Memory): Memory {
  const url = safeUrl(page.url);
  const text = page.text
    .replace(/\u0000/g, "")
    .trim()
    .slice(0, MAX_PAGE_TEXT);
  if (text.length < 40)
    throw new Error(
      "This page has too little readable text to save. Try a full article or paste its text.",
    );
  const now = new Date().toISOString();
  return {
    id: existing?.id ?? crypto.randomUUID(),
    url,
    canonicalUrl: canonicalUrl(url),
    title: page.title.trim().slice(0, 200) || new URL(url).hostname,
    text,
    summary: excerpt(text),
    excerpts: sentences(text)
      .filter((x) => x.length > 25)
      .slice(0, 3)
      .map((x) => excerpt(x, 450)),
    tags: suggestedTags(page.title + " " + text),
    kind: "article",
    cover: "quote",
    color: "sand",
    savedAt: existing?.savedAt ?? now,
    updatedAt: now,
    source: page.tabId != null ? "tab" : "manual",
    analysis: "excerpt",
    favorite: existing?.favorite ?? false,
    archived: existing?.archived ?? false,
    collectionIds: existing?.collectionIds ?? [],
    notes: existing?.notes,
    readAt: existing?.readAt,
    reminder: existing?.reminder,
    tabId: page.tabId,
    windowId: page.windowId,
  };
}

export function rankMemories(memories: Memory[], query: string): Memory[] {
  const terms = [...new Set(words(query))];
  if (!terms.length)
    return [...memories].sort((a, b) => b.savedAt.localeCompare(a.savedAt));
  const scored = memories.map((memory) => {
    const title = normalize(memory.title),
      tags = normalize(memory.tags.join(" "));
    const summary = normalize(memory.summary),
      text = normalize(memory.text),
      notes = normalize(memory.notes ?? "");
    let score = 0,
      matched = 0;
    for (const term of terms) {
      const matches = [
        title.includes(term),
        tags.includes(term),
        summary.includes(term),
        text.includes(term),
        notes.includes(term),
      ];
      if (matches.some(Boolean)) matched++;
      score +=
        (matches[0] ? 12 : 0) +
        (matches[1] ? 8 : 0) +
        (matches[2] ? 5 : 0) +
        (matches[3] ? 1 : 0) +
        (matches[4] ? 6 : 0);
    }
    if (title.includes(normalize(query.trim()))) score += 20;
    score += matched * matched * 2;
    return { memory, score };
  });
  return scored
    .filter((x) => x.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score || b.memory.savedAt.localeCompare(a.memory.savedAt),
    )
    .map((x) => x.memory);
}
export function relevantExcerpts(memory: Memory, question: string): string[] {
  const terms = words(question);
  const candidates = [
    ...new Set([...memory.excerpts, ...sentences(memory.text)]),
  ].filter((x) => x.length > 20);
  const sorted = candidates.map((text, index) => ({
    text,
    index,
    score:
      terms.reduce((n, w) => n + (normalize(text).includes(w) ? 2 : 0), 0) +
      (/[$€£]|pricing|price|per month|free tier/i.test(question) &&
      /[$€£]|pricing|per month|free/i.test(text)
        ? 5
        : 0),
  }));
  return sorted
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, 3)
    .map((x) => excerpt(x.text, 450));
}
export function previewCloud(
  question: string,
  memories: Memory[],
): CloudPreview {
  const cleanQuestion = question.trim();
  if (!cleanQuestion || cleanQuestion.length > 1200)
    throw new Error("Write a question of 1–1,200 characters.");
  if (!memories.length) throw new Error("Choose at least one saved source.");
  if (memories.length > MAX_CLOUD_SOURCES)
    throw new Error(
      `Choose up to ${MAX_CLOUD_SOURCES} sources for one question.`,
    );
  const sources: SourceSnippet[] = memories.map((memory, index) => ({
    number: index + 1,
    memoryId: memory.id,
    title: memory.title,
    url: memory.url,
    savedAt: memory.savedAt,
    summary: excerpt(memory.summary, 1000),
    excerpts: relevantExcerpts(memory, cleanQuestion),
  }));
  const sourcesText = JSON.stringify(sources);
  const requestText = JSON.stringify({ question: cleanQuestion, sources });
  return {
    question: cleanQuestion,
    sources,
    pageContentBytes: new TextEncoder().encode(sourcesText).byteLength,
    requestText,
  };
}
export function parseAnswer(
  raw: string,
  preview: CloudPreview,
): { answer: string; unknowns: string[] } {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
  let value: unknown;
  try {
    value = JSON.parse(cleaned);
  } catch {
    throw new Error(
      "Gemini returned an unreadable answer. Your saved sources are safe; try again.",
    );
  }
  if (
    !value ||
    typeof value !== "object" ||
    !("answer" in value) ||
    typeof value.answer !== "string" ||
    !value.answer.trim() ||
    value.answer.length > 12_000
  )
    throw new Error(
      "Gemini did not return a usable answer. Try a more specific question.",
    );
  const answer = value.answer.trim();
  const citations = [...answer.matchAll(/\[(\d+)\]/g)].map((match) =>
    Number(match[1]),
  );
  if (
    !citations.length ||
    citations.some(
      (n) => !preview.sources.some((source) => source.number === n),
    )
  )
    throw new Error(
      "The answer did not cite the approved sources correctly. It has not been added to your workspace.",
    );
  const unknowns =
    "unknowns" in value && Array.isArray(value.unknowns)
      ? value.unknowns
          .filter((x): x is string => typeof x === "string")
          .slice(0, 8)
          .map((x) => x.slice(0, 700))
      : [];
  return { answer, unknowns };
}
export function validateAIConfig(
  json: string,
  mode: AIConfig["appCheckMode"],
  siteKey: string,
  model: string,
): AIConfig {
  let firebase;
  try {
    firebase = JSON.parse(json);
  } catch {
    throw new Error("Paste the JSON configuration for your Firebase Web app.");
  }
  if (!firebase || typeof firebase !== "object")
    throw new Error("The Firebase configuration must be a JSON object.");
  for (const key of ["apiKey", "projectId", "appId"])
    if (typeof firebase[key] !== "string" || !firebase[key].trim())
      throw new Error(`Your Firebase configuration needs ${key}.`);
  if (!/^[a-z0-9][a-z0-9-]{3,62}$/i.test(firebase.projectId))
    throw new Error("Check the Firebase project ID.");
  if (mode === "enterprise" && !siteKey.trim())
    throw new Error("Add your reCAPTCHA Enterprise site key.");
  if (!/^gemini-[a-z0-9.-]+$/i.test(model.trim()))
    throw new Error(
      "Use a Gemini model name, for example gemini-3.5-flash-lite.",
    );
  const allowed = [
    "apiKey",
    "projectId",
    "appId",
    "authDomain",
    "messagingSenderId",
    "storageBucket",
  ];
  return {
    firebase: Object.fromEntries(
      allowed
        .filter((k) => typeof firebase[k] === "string")
        .map((k) => [k, firebase[k].trim()]),
    ) as AIConfig["firebase"],
    appCheckMode: mode,
    siteKey: siteKey.trim(),
    model: model.trim(),
  };
}

export function serializeBackup(
  memories: Memory[],
  collections: { id: string; name: string; color: string }[],
) {
  return JSON.stringify(
    {
      format: "tab-brain",
      version: 1,
      exportedAt: new Date().toISOString(),
      memories: memories.map(
        ({ tabId: _tabId, windowId: _windowId, ...memory }) => memory,
      ),
      collections,
    },
    null,
    2,
  );
}
export function parseBackup(raw: string): {
  memories: Memory[];
  collections: { id: string; name: string; color: string }[];
} {
  if (new TextEncoder().encode(raw).byteLength > MAX_IMPORT_BYTES)
    throw new Error("This backup is too large. The limit is 12 MB.");
  let value;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new Error("This file is not a valid JSON backup.");
  }
  if (
    value?.format !== "tab-brain" ||
    value?.version !== 1 ||
    !Array.isArray(value.memories) ||
    value.memories.length > 3000
  )
    throw new Error(
      "Choose a Tab Brain version 1 backup with up to 3,000 memories.",
    );
  const ids = new Set<string>();
  const memories: Memory[] = value.memories.map((item: unknown) => {
    if (!item || typeof item !== "object")
      throw new Error("The backup contains an invalid memory.");
    const m = item as Record<string, unknown>;
    if (
      typeof m.id !== "string" ||
      !m.id ||
      m.id.length > 100 ||
      ids.has(m.id) ||
      typeof m.title !== "string" ||
      typeof m.text !== "string" ||
      typeof m.url !== "string" ||
      typeof m.summary !== "string"
    )
      throw new Error(
        "The backup contains missing fields or duplicate memory IDs.",
      );
    ids.add(m.id);
    const now = new Date().toISOString();
    const colors = ["sand", "mint", "lavender", "peach", "sky", "rose"];
    const covers = ["orbit", "code", "window", "garden", "quote", "layers"];
    const cleanDate = (d: unknown) =>
      typeof d === "string" && Number.isFinite(Date.parse(d))
        ? new Date(d).toISOString()
        : now;
    return {
      id: m.id,
      title: m.title.slice(0, 200),
      url: safeUrl(m.url),
      canonicalUrl: canonicalUrl(m.url),
      text: m.text.slice(0, MAX_PAGE_TEXT),
      summary: m.summary.slice(0, 1500),
      excerpts: Array.isArray(m.excerpts)
        ? m.excerpts
            .filter((x): x is string => typeof x === "string")
            .slice(0, 3)
            .map((x) => x.slice(0, 450))
        : [],
      tags: Array.isArray(m.tags)
        ? m.tags
            .filter((x): x is string => typeof x === "string")
            .slice(0, 6)
            .map((x) => x.replace(/^#/, "").slice(0, 30))
        : [],
      savedAt: cleanDate(m.savedAt),
      updatedAt: cleanDate(m.updatedAt),
      kind: ["article", "guide", "documentation", "tool"].includes(
        String(m.kind),
      )
        ? (m.kind as Memory["kind"])
        : "article",
      cover: covers.includes(String(m.cover))
        ? (m.cover as Memory["cover"])
        : "quote",
      color: colors.includes(String(m.color)) ? String(m.color) : "sand",
      source: "manual",
      analysis: "imported",
      favorite: m.favorite === true,
      archived: m.archived === true,
      notes: typeof m.notes === "string" ? m.notes.slice(0, 4000) : undefined,
      readAt:
        typeof m.readAt === "string" && Number.isFinite(Date.parse(m.readAt))
          ? new Date(m.readAt).toISOString()
          : undefined,
      reminder:
        m.reminder &&
        typeof m.reminder === "object" &&
        typeof (m.reminder as Record<string, unknown>).at === "string" &&
        Number.isFinite(Date.parse((m.reminder as Record<string, string>).at))
          ? {
              at: new Date(
                (m.reminder as Record<string, string>).at,
              ).toISOString(),
            }
          : undefined,
      collectionIds: Array.isArray(m.collectionIds)
        ? m.collectionIds
            .filter((x): x is string => typeof x === "string")
            .slice(0, 20)
        : [],
    };
  });
  const collections = Array.isArray(value.collections)
    ? value.collections
        .slice(0, 100)
        .filter(
          (c: unknown) =>
            c &&
            typeof c === "object" &&
            typeof (c as Record<string, unknown>).id === "string" &&
            typeof (c as Record<string, unknown>).name === "string",
        )
        .map((c: { id: string; name: string; color?: string }) => ({
          id: c.id.slice(0, 100),
          name: c.name.slice(0, 40),
          color:
            typeof c.color === "string" && /^#[a-f\d]{6}$/i.test(c.color)
              ? c.color
              : "#bdcfa8",
        }))
    : [];
  return { memories, collections };
}
