import type {
  Activity,
  Answer,
  Collection,
  LibrarySnapshot,
  Memory,
  Settings,
} from "./types";
import { hostedAIConfig, upgradeHostedAIConfig } from "./firebaseConfig";
import { needsNotification } from "./reminders";

const DB_NAME = "tab-brain-v1";
let pending: Promise<IDBDatabase> | undefined;
const settingsDefault: Settings = {
  initialized: false,
  cloudBytes: 0,
  cloudRequests: 0,
};

function defaultSettings(): Settings {
  const ai = hostedAIConfig();
  return { ...settingsDefault, ...(ai ? { ai } : {}) };
}
function mergedSettings(saved?: Settings): Settings {
  const current = { ...defaultSettings(), ...saved };
  const ai = upgradeHostedAIConfig(current.ai);
  return ai === current.ai ? current : { ...current, ai };
}
function keepNotificationReceipt(incoming: Memory, current?: Memory): Memory {
  if (
    incoming.reminder &&
    current?.reminder?.at === incoming.reminder.at &&
    current.reminder.notifiedAt &&
    (!incoming.reminder.notifiedAt ||
      current.reminder.notifiedAt > incoming.reminder.notifiedAt)
  )
    return {
      ...incoming,
      reminder: {
        ...incoming.reminder,
        notifiedAt: current.reminder.notifiedAt,
      },
    };
  return incoming;
}

function open(): Promise<IDBDatabase> {
  if (pending) return pending;
  pending = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      const memories = db.createObjectStore("memories", { keyPath: "id" });
      memories.createIndex("canonicalUrl", "canonicalUrl");
      db.createObjectStore("collections", { keyPath: "id" });
      db.createObjectStore("activity", { keyPath: "id" });
      db.createObjectStore("settings");
      db.createObjectStore("answers", { keyPath: "id" });
    };
    request.onsuccess = () => {
      request.result.onversionchange = () => {
        request.result.close();
        pending = undefined;
      };
      resolve(request.result);
    };
    request.onerror = () => {
      pending = undefined;
      reject(
        new Error(
          "Local storage is unavailable. Enable site storage to save your memories.",
        ),
      );
    };
    request.onblocked = () => {
      pending = undefined;
      reject(
        new Error(
          "Close other Tab Brain windows and try again to update local storage.",
        ),
      );
    };
  });
  return pending;
}
function done(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = transaction.onerror = () =>
      reject(
        new Error(
          "The save did not finish. Your tabs have been left open. Check available storage and try again.",
        ),
      );
  });
}
function result<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
export async function snapshot(): Promise<LibrarySnapshot> {
  const db = await open();
  const tx = db.transaction(
    ["memories", "collections", "activity", "settings"],
    "readonly",
  );
  const [memories, collections, activity, settings] = await Promise.all([
    result<Memory[]>(tx.objectStore("memories").getAll()),
    result<Collection[]>(tx.objectStore("collections").getAll()),
    result<Activity[]>(tx.objectStore("activity").getAll()),
    result<Settings | undefined>(tx.objectStore("settings").get("main")),
  ]);
  return {
    memories,
    collections,
    activity: activity.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 40),
    settings: mergedSettings(settings),
  };
}
export async function putMemories(
  memories: Memory[],
  event?: Omit<Activity, "id" | "at">,
): Promise<void> {
  const db = await open();
  const tx = db.transaction(
    event ? ["memories", "activity"] : ["memories"],
    "readwrite",
  );
  const finished = done(tx);
  memories.forEach((memory) => {
    const request = tx.objectStore("memories").get(memory.id);
    request.onsuccess = () =>
      tx
        .objectStore("memories")
        .put(keepNotificationReceipt(memory, request.result));
  });
  if (event)
    tx.objectStore("activity").put({
      ...event,
      id: crypto.randomUUID(),
      at: new Date().toISOString(),
    });
  await finished;
}
export async function storedMemory(id: string): Promise<Memory | undefined> {
  const db = await open();
  return result(
    db.transaction("memories", "readonly").objectStore("memories").get(id),
  );
}
export async function removeMemory(id: string): Promise<void> {
  const db = await open();
  const tx = db.transaction("memories", "readwrite");
  const finished = done(tx);
  tx.objectStore("memories").delete(id);
  await finished;
}
export async function putSettings(settings: Settings): Promise<void> {
  const db = await open();
  const tx = db.transaction("settings", "readwrite");
  const finished = done(tx);
  tx.objectStore("settings").put(settings, "main");
  await finished;
}
export async function updateSettings(
  patch: Partial<Settings>,
): Promise<Settings> {
  const db = await open();
  const tx = db.transaction("settings", "readwrite");
  const finished = done(tx);
  let next = defaultSettings();
  const request = tx.objectStore("settings").get("main");
  request.onsuccess = () => {
    next = { ...mergedSettings(request.result), ...patch };
    tx.objectStore("settings").put(next, "main");
  };
  await finished;
  return next;
}
export async function claimDueReminders(now = Date.now()): Promise<Memory[]> {
  const db = await open();
  const tx = db.transaction("memories", "readwrite");
  const finished = done(tx);
  const claimed: Memory[] = [];
  const request = tx.objectStore("memories").openCursor();
  request.onsuccess = () => {
    const cursor = request.result;
    if (!cursor) return;
    const memory = cursor.value as Memory;
    if (needsNotification(memory, now)) {
      const next = {
        ...memory,
        reminder: {
          ...memory.reminder!,
          notifiedAt: new Date(now).toISOString(),
        },
      };
      cursor.update(next);
      claimed.push(next);
    }
    cursor.continue();
  };
  await finished;
  return claimed;
}
export async function putCollection(collection: Collection): Promise<void> {
  const db = await open();
  const tx = db.transaction("collections", "readwrite");
  const finished = done(tx);
  tx.objectStore("collections").put(collection);
  await finished;
}
export async function removeCollection(id: string): Promise<void> {
  const db = await open();
  const tx = db.transaction(["collections", "memories"], "readwrite");
  const finished = done(tx);
  tx.objectStore("collections").delete(id);
  const request = tx.objectStore("memories").openCursor();
  request.onsuccess = () => {
    const cursor = request.result;
    if (!cursor) return;
    const memory = cursor.value as Memory;
    if (memory.collectionIds.includes(id))
      cursor.update({
        ...memory,
        collectionIds: memory.collectionIds.filter((x) => x !== id),
      });
    cursor.continue();
  };
  await finished;
}
export async function initializeLibrary(
  memories: Memory[],
  collections: Collection[],
): Promise<void> {
  const db = await open();
  const tx = db.transaction(
    ["memories", "collections", "settings"],
    "readwrite",
  );
  const finished = done(tx);
  const check = tx.objectStore("settings").get("main");
  check.onsuccess = () => {
    if (check.result?.initialized) {
      const next = mergedSettings(check.result);
      if (next.ai !== check.result.ai)
        tx.objectStore("settings").put(next, "main");
      return;
    }
    memories.forEach((m) => tx.objectStore("memories").put(m));
    collections.forEach((c) => tx.objectStore("collections").put(c));
    tx.objectStore("settings").put(
      { ...defaultSettings(), initialized: true },
      "main",
    );
  };
  await finished;
}
export async function importLibrary(
  memories: Memory[],
  collections: Collection[],
): Promise<void> {
  const db = await open();
  const tx = db.transaction(
    ["memories", "collections", "activity"],
    "readwrite",
  );
  const finished = done(tx);
  const existing = tx.objectStore("memories").getAll();
  existing.onsuccess = () => {
    const all = existing.result as Memory[];
    for (const memory of memories) {
      const found = all.find(
        (m) => m.id === memory.id || m.canonicalUrl === memory.canonicalUrl,
      );
      // Imported backups do not overwrite a newer local edit.
      if (found && found.updatedAt > memory.updatedAt) continue;
      tx.objectStore("memories").put(
        keepNotificationReceipt(
          { ...memory, id: found?.id ?? memory.id },
          found,
        ),
      );
    }
    collections.forEach((c) => tx.objectStore("collections").put(c));
    tx.objectStore("activity").put({
      id: crypto.randomUUID(),
      at: new Date().toISOString(),
      kind: "import",
      title: "Backup imported",
      detail: `${memories.length} memories checked. Newer local edits kept.`,
    });
  };
  await finished;
}
export async function clearSampleMemories(): Promise<void> {
  const db = await open();
  const tx = db.transaction("memories", "readwrite");
  const finished = done(tx);
  const request = tx.objectStore("memories").openCursor();
  request.onsuccess = () => {
    const cursor = request.result;
    if (!cursor) return;
    if (cursor.value.source === "sample") cursor.delete();
    cursor.continue();
  };
  await finished;
}
export async function recordCloudAttempt(
  bytes: number,
  sourceCount: number,
): Promise<Settings> {
  const db = await open();
  const tx = db.transaction(["settings", "activity"], "readwrite");
  const finished = done(tx);
  let next = defaultSettings();
  const request = tx.objectStore("settings").get("main");
  request.onsuccess = () => {
    const current = mergedSettings(request.result);
    next = {
      ...current,
      cloudBytes: current.cloudBytes + bytes,
      cloudRequests: current.cloudRequests + 1,
    };
    tx.objectStore("settings").put(next, "main");
    tx.objectStore("activity").put({
      id: crypto.randomUUID(),
      at: new Date().toISOString(),
      kind: "cloud",
      title: "Cloud request approved",
      detail: `${sourceCount} source snippets · ${bytes.toLocaleString()} page-content bytes in the approved request.`,
    });
  };
  await finished;
  return next;
}
export async function answers(): Promise<Answer[]> {
  const db = await open();
  const items = await result<Answer[]>(
    db.transaction("answers", "readonly").objectStore("answers").getAll(),
  );
  return items.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 30);
}
export async function putAnswer(answer: Answer): Promise<void> {
  const db = await open();
  const tx = db.transaction("answers", "readwrite");
  const finished = done(tx);
  tx.objectStore("answers").put(answer);
  await finished;
}
