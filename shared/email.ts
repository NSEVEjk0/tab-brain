export const MAX_EMAIL_BOOKMARKS = 100;
export const EMAIL_SUMMARY_LENGTH = 320;
export interface EmailBookmark {
  id: string;
  title: string;
  url: string;
  summary?: string;
  savedAt: string;
  reminderAt?: string;
}
export interface EmailPreferences {
  frequency: "daily" | "weekly";
  timeZone: string;
  hour: number;
  weekday: number;
  includeSummaries: boolean;
  reminderEmails: boolean;
}
export interface EmailPlanInput extends EmailPreferences {
  bookmarks: EmailBookmark[];
  consent: true;
}
export interface EmailMessage {
  subject: string;
  html: string;
  text: string;
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Choose your bookmark list and email schedule first.");
  return value as Record<string, unknown>;
}
function onlyFields(value: Record<string, unknown>, fields: string[]) {
  if (Object.keys(value).some((key) => !fields.includes(key)))
    throw new Error(
      "Email plans accept only the approved titles, links, short summaries, and reminder times.",
    );
}
function text(value: unknown, max: number): string {
  if (typeof value !== "string")
    throw new Error("The email preview contains a missing text field.");
  const clean = value
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!clean || clean.length > max)
    throw new Error("The email preview contains an empty or oversized field.");
  return clean;
}
function date(value: unknown): string {
  if (
    typeof value !== "string" ||
    value.length > 40 ||
    !Number.isFinite(Date.parse(value))
  )
    throw new Error("The email preview contains an invalid date.");
  return new Date(value).toISOString();
}
function webUrl(value: unknown): string {
  const raw = text(value, 2000);
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("Each bookmark needs a valid web link.");
  }
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password
  )
    throw new Error(
      "Email bookmarks need http or https links without embedded credentials.",
    );
  return url.href;
}
export function validateEmailPlan(value: unknown): EmailPlanInput {
  const input = record(value);
  onlyFields(input, [
    "frequency",
    "timeZone",
    "hour",
    "weekday",
    "includeSummaries",
    "reminderEmails",
    "bookmarks",
    "consent",
  ]);
  if (input.consent !== true)
    throw new Error("Approve the bookmark preview before turning on emails.");
  if (!["daily", "weekly"].includes(String(input.frequency)))
    throw new Error("Choose a daily or weekly brief.");
  if (
    !Number.isInteger(input.hour) ||
    Number(input.hour) < 0 ||
    Number(input.hour) > 23 ||
    !Number.isInteger(input.weekday) ||
    Number(input.weekday) < 0 ||
    Number(input.weekday) > 6
  )
    throw new Error("Choose a valid delivery time.");
  const timeZone = text(input.timeZone, 100);
  try {
    new Intl.DateTimeFormat("en", { timeZone }).format(new Date());
  } catch {
    throw new Error("Choose a valid time zone, such as Africa/Lagos.");
  }
  if (
    typeof input.includeSummaries !== "boolean" ||
    typeof input.reminderEmails !== "boolean"
  )
    throw new Error("Choose whether to include summaries and reminder emails.");
  if (
    !Array.isArray(input.bookmarks) ||
    input.bookmarks.length < 1 ||
    input.bookmarks.length > MAX_EMAIL_BOOKMARKS
  )
    throw new Error(
      `Choose between 1 and ${MAX_EMAIL_BOOKMARKS} bookmarks for your brief.`,
    );
  const seen = new Set<string>();
  const bookmarks: EmailBookmark[] = input.bookmarks.map((value) => {
    const item = record(value);
    onlyFields(item, [
      "id",
      "title",
      "url",
      "summary",
      "savedAt",
      "reminderAt",
    ]);
    const id = text(item.id, 100);
    if (seen.has(id))
      throw new Error("The email preview contains a duplicate bookmark.");
    seen.add(id);
    const result: EmailBookmark = {
      id,
      title: text(item.title, 200),
      url: webUrl(item.url),
      savedAt: date(item.savedAt),
    };
    if (
      input.includeSummaries &&
      item.summary !== undefined &&
      item.summary !== ""
    )
      result.summary = text(item.summary, EMAIL_SUMMARY_LENGTH);
    else if (!input.includeSummaries && item.summary !== undefined)
      throw new Error(
        "Remove summaries from the preview when summary sharing is turned off.",
      );
    if (input.reminderEmails && item.reminderAt !== undefined)
      result.reminderAt = date(item.reminderAt);
    else if (!input.reminderEmails && item.reminderAt !== undefined)
      throw new Error(
        "Remove reminder dates from the preview when email reminders are turned off.",
      );
    return result;
  });
  return {
    frequency: input.frequency as EmailPreferences["frequency"],
    timeZone,
    hour: Number(input.hour),
    weekday: Number(input.weekday),
    includeSummaries: input.includeSummaries,
    reminderEmails: input.reminderEmails,
    bookmarks,
    consent: true,
  };
}

type DateParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
};
function dateFormatter(timeZone: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
}
function parts(formatter: Intl.DateTimeFormat, timestamp: number): DateParts {
  return Object.fromEntries(
    formatter
      .formatToParts(new Date(timestamp))
      .filter((part) =>
        ["year", "month", "day", "hour", "minute"].includes(part.type),
      )
      .map((part) => [part.type, Number(part.value)]),
  ) as DateParts;
}
function localWall(parts: DateParts) {
  return Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
  );
}
export function nextDigestAt(
  preferences: Pick<
    EmailPreferences,
    "frequency" | "timeZone" | "hour" | "weekday"
  >,
  after: Date,
): string {
  const afterTime = after.getTime();
  if (!Number.isFinite(afterTime))
    throw new Error("A valid start time is required.");
  const formatter = dateFormatter(preferences.timeZone);
  const local = parts(formatter, afterTime);
  for (let day = 0; day < 9; day++) {
    const calendar = new Date(
      Date.UTC(local.year, local.month - 1, local.day + day),
    );
    if (
      preferences.frequency === "weekly" &&
      calendar.getUTCDay() !== preferences.weekday
    )
      continue;
    const target = Date.UTC(
      calendar.getUTCFullYear(),
      calendar.getUTCMonth(),
      calendar.getUTCDate(),
      preferences.hour,
    );
    const offsets = new Set(
      [-36, 0, 36].map((hours) => {
        const sample = target + hours * 60 * 60_000;
        return localWall(parts(formatter, sample)) - sample;
      }),
    );
    const candidates = [...offsets]
      .map((offset) => target - offset)
      .filter((timestamp) => localWall(parts(formatter, timestamp)) === target)
      .sort((a, b) => a - b);
    let candidate = candidates[0];
    if (candidate === undefined) {
      // A clock change can remove a local hour. Deliver at the next valid local time that day.
      const guesses = [...offsets].map((offset) => target - offset);
      let closestWall = Infinity;
      for (
        let timestamp = Math.min(...guesses) - 3 * 60 * 60_000;
        timestamp <= Math.max(...guesses) + 3 * 60 * 60_000;
        timestamp += 60_000
      ) {
        const wall = localWall(parts(formatter, timestamp));
        if (
          wall < target ||
          wall >= target + (24 - preferences.hour) * 60 * 60_000
        )
          continue;
        if (
          wall < closestWall ||
          (wall === closestWall && timestamp < candidate)
        ) {
          closestWall = wall;
          candidate = timestamp;
        }
      }
    }
    // Choose the first occurrence of a repeated local hour, then move to the next day.
    if (candidate !== undefined && candidate > afterTime)
      return new Date(candidate).toISOString();
  }
  throw new Error("The next delivery time could not be calculated.");
}
export function nextEmailRun(
  nextDigest: string,
  bookmarks: EmailBookmark[],
  sentReminderAt: Record<string, string>,
): string {
  return bookmarks.reduce(
    (next, bookmark) =>
      bookmark.reminderAt &&
      sentReminderAt[bookmark.id] !== bookmark.reminderAt &&
      bookmark.reminderAt < next
        ? bookmark.reminderAt
        : next,
    nextDigest,
  );
}

export function escapeEmail(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
export function renderEmailBrief(
  bookmarks: EmailBookmark[],
  options: {
    includeSummaries: boolean;
    kind?: "digest" | "reminders";
    workspaceUrl: string;
    unsubscribeUrl?: string;
  },
): EmailMessage {
  const reminder = options.kind === "reminders";
  const subject = reminder
    ? "A page worth coming back to"
    : "Your Tab Brain reading brief";
  const intro = reminder
    ? "You wanted to come back to these pages. Here is your reminder."
    : "Here are the bookmarks you chose for your reading brief. Pick one when you have a little time.";
  const items = bookmarks
    .map(
      (bookmark) =>
        `<li style="margin:0 0 22px"><a href="${escapeEmail(webUrl(bookmark.url))}" style="color:#426137;font-weight:600">${escapeEmail(bookmark.title)}</a>${options.includeSummaries && bookmark.summary ? `<p style="margin:7px 0;color:#66745b;line-height:1.7">${escapeEmail(bookmark.summary)}</p>` : ""}</li>`,
    )
    .join("");
  const unsubscribe = options.unsubscribeUrl
    ? `<p style="font-size:12px;color:#87917d;margin-top:28px"><a href="${escapeEmail(webUrl(options.unsubscribeUrl))}" style="color:#748367">Stop these emails</a>. Your saved pages stay on your device.</p>`
    : "";
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#f6f8ef;font-family:Arial,sans-serif;color:#415437"><main style="max-width:600px;margin:30px auto;padding:28px;background:#fffefa;border:1px solid #e0e7d5;border-radius:12px"><p style="font-size:13px;letter-spacing:2px;color:#829671">TAB BRAIN</p><h1 style="font-family:Georgia,serif;font-size:30px;font-weight:400">${escapeEmail(subject)}</h1><p style="font-size:14px;line-height:1.8;color:#76866b">${intro}</p><ol style="padding-left:21px;margin:26px 0">${items}</ol><a href="${escapeEmail(webUrl(options.workspaceUrl))}" style="color:#426137">Open your Tab Brain workspace</a><p style="font-size:12px;line-height:1.7;color:#87917d;margin-top:25px">This brief uses the last bookmark list you approved. Add new pages to the list in Tab Brain when you want them included.</p>${unsubscribe}</main></body></html>`;
  const plain = [
    subject,
    "",
    intro,
    "",
    ...bookmarks.flatMap((bookmark, index) => [
      `${index + 1}. ${bookmark.title}`,
      bookmark.url,
      ...(options.includeSummaries && bookmark.summary
        ? [bookmark.summary]
        : []),
      "",
    ]),
    `Open Tab Brain: ${options.workspaceUrl}`,
    "",
    "This brief uses the last bookmark list you approved.",
    ...(options.unsubscribeUrl
      ? [`Stop these emails: ${options.unsubscribeUrl}`]
      : []),
  ].join("\n");
  return { subject, html, text: plain };
}
