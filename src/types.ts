export type MemoryKind = "article" | "guide" | "documentation" | "tool";
export type Analysis = "sample" | "excerpt" | "on-device" | "imported";
export type Cover = "orbit" | "code" | "window" | "garden" | "quote" | "layers";

export interface ModelEvidence {
  name: string;
  inferenceSource: "on-device" | "cloud";
  verifiedAt: string;
}
export interface Reminder {
  at: string;
  notifiedAt?: string;
}

export interface Memory {
  id: string;
  url: string;
  canonicalUrl: string;
  title: string;
  text: string;
  summary: string;
  excerpts: string[];
  tags: string[];
  kind: MemoryKind;
  cover: Cover;
  color: string;
  savedAt: string;
  updatedAt: string;
  source: "sample" | "manual" | "tab";
  analysis: Analysis;
  favorite: boolean;
  archived: boolean;
  collectionIds: string[];
  notes?: string;
  readAt?: string;
  reminder?: Reminder;
  modelEvidence?: ModelEvidence;
  tabId?: number;
  windowId?: number;
}

export interface Collection {
  id: string;
  name: string;
  color: string;
}
export interface Activity {
  id: string;
  at: string;
  kind: "capture" | "organize" | "cloud" | "import";
  title: string;
  detail: string;
}
export interface FirebaseConfig {
  apiKey: string;
  projectId: string;
  appId: string;
  authDomain?: string;
  messagingSenderId?: string;
  storageBucket?: string;
}
export interface AIConfig {
  firebase: FirebaseConfig;
  appCheckMode: "debug" | "enterprise";
  siteKey: string;
  model: string;
}
export interface Settings {
  initialized: boolean;
  ai?: AIConfig;
  cloudBytes: number;
  cloudRequests: number;
  reminderNotifications?: boolean;
}
export interface LibrarySnapshot {
  memories: Memory[];
  collections: Collection[];
  activity: Activity[];
  settings: Settings;
}
export interface ExtractedPage {
  title: string;
  url: string;
  text: string;
  tabId?: number;
  windowId?: number;
}
export interface SourceSnippet {
  number: number;
  memoryId: string;
  title: string;
  url: string;
  savedAt: string;
  summary: string;
  excerpts: string[];
}
export interface CloudPreview {
  question: string;
  sources: SourceSnippet[];
  pageContentBytes: number;
  requestText: string;
}
export interface Answer {
  id: string;
  question: string;
  answer: string;
  unknowns: string[];
  sources: SourceSnippet[];
  at: string;
  bytes: number;
  modelEvidence?: ModelEvidence;
}
