import type { Memory } from "../../src/types";

export function memory(overrides: Partial<Memory> = {}): Memory {
  return {
    id: "m-1",
    title: "A useful page",
    url: "https://example.com/read",
    canonicalUrl: "https://example.com/read",
    text: "Readable source text for a useful page. The useful detail is preserved in this original page text.",
    summary: "This is a useful summary. It keeps a detail worth remembering.",
    excerpts: ["The useful detail is preserved in this original page text."],
    tags: ["research", "notes", "knowledge"],
    kind: "article",
    cover: "quote",
    color: "sand",
    source: "manual",
    analysis: "excerpt",
    savedAt: "2026-11-17T08:00:00.000Z",
    updatedAt: "2026-11-17T08:00:00.000Z",
    favorite: false,
    archived: false,
    collectionIds: [],
    ...overrides,
  };
}
