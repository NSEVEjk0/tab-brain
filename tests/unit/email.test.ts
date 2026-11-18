import { describe, expect, it } from "vitest";
import {
  nextDigestAt,
  nextEmailRun,
  renderEmailBrief,
  validateEmailPlan,
  type EmailPlanInput,
} from "../../shared/email";

const input: EmailPlanInput = {
  frequency: "daily",
  timeZone: "Africa/Lagos",
  hour: 8,
  weekday: 1,
  includeSummaries: true,
  reminderEmails: false,
  consent: true,
  bookmarks: [
    {
      id: "m-1",
      title: "A useful page",
      url: "https://example.com/read",
      summary: "A short saved summary.",
      savedAt: "2026-11-18T09:00:00.000Z",
    },
  ],
};
describe("email consent and recipient boundaries", () => {
  it("accepts only the approved metadata and refuses full page text, notes, or an arbitrary recipient", () => {
    expect(validateEmailPlan(input).bookmarks).toEqual(input.bookmarks);
    expect(() => validateEmailPlan({ ...input, consent: false })).toThrow(
      "Approve",
    );
    expect(() =>
      validateEmailPlan({ ...input, to: "unapproved@example.invalid" }),
    ).toThrow("only the approved");
    for (const field of ["text", "notes"])
      expect(() =>
        validateEmailPlan({
          ...input,
          bookmarks: [{ ...input.bookmarks[0], [field]: "PRIVATE_DATA" }],
        }),
      ).toThrow("only the approved");
    expect(() =>
      validateEmailPlan({
        ...input,
        bookmarks: [{ ...input.bookmarks[0], url: "javascript:alert(1)" }],
      }),
    ).toThrow("http");
    expect(() =>
      validateEmailPlan({ ...input, timeZone: "Not/AZone" }),
    ).toThrow("time zone");
  });
  it("escapes bookmark text in HTML and omits summaries when sharing is disabled", () => {
    const bookmarks = [
      {
        ...input.bookmarks[0],
        title: '<img src=x onerror="alert(1)">',
        summary: "<script>alert(1)</script>",
      },
    ];
    const brief = renderEmailBrief(bookmarks, {
      includeSummaries: true,
      workspaceUrl: "https://example.com",
    });
    expect(brief.html).not.toContain("<img");
    expect(brief.html).not.toContain("<script");
    expect(brief.html).toContain("&lt;img");
    expect(
      renderEmailBrief(bookmarks, {
        includeSummaries: false,
        workspaceUrl: "https://example.com",
      }).text,
    ).not.toContain("<script>");
    expect(() =>
      validateEmailPlan({ ...input, includeSummaries: false }),
    ).toThrow("Remove summaries");
  });
});
describe("delivery times in the reader’s time zone", () => {
  it("keeps the requested morning time across UTC date boundaries and fractional offsets", () => {
    expect(nextDigestAt(input, new Date("2026-11-18T21:00:00Z"))).toBe(
      "2026-11-19T07:00:00.000Z",
    );
    expect(
      nextDigestAt(
        { ...input, timeZone: "Asia/Kathmandu" },
        new Date("2026-11-18T01:00:00Z"),
      ),
    ).toBe("2026-11-18T02:15:00.000Z");
    expect(
      nextDigestAt(
        { ...input, timeZone: "Pacific/Kiritimati" },
        new Date("2026-11-18T13:00:00Z"),
      ),
    ).toBe("2026-11-18T18:00:00.000Z");
  });
  it("moves a missing clock-change hour forward and does not send twice in a repeated hour", () => {
    expect(
      nextDigestAt(
        { ...input, timeZone: "America/New_York", hour: 2 },
        new Date("2026-03-08T06:30:00Z"),
      ),
    ).toBe("2026-03-08T07:00:00.000Z");
    expect(
      nextDigestAt(
        {
          ...input,
          frequency: "weekly",
          weekday: 0,
          timeZone: "America/New_York",
          hour: 1,
        },
        new Date("2026-11-01T05:00:01Z"),
      ),
    ).toBe("2026-11-08T06:00:00.000Z");
  });
  it("schedules unsent reminders once and recognizes a changed reminder date", () => {
    const bookmark = {
      ...input.bookmarks[0],
      reminderAt: "2026-11-18T10:00:00.000Z",
    };
    expect(nextEmailRun("2026-11-19T07:00:00.000Z", [bookmark], {})).toBe(
      bookmark.reminderAt,
    );
    expect(
      nextEmailRun("2026-11-19T07:00:00.000Z", [bookmark], {
        "m-1": bookmark.reminderAt,
      }),
    ).toBe("2026-11-19T07:00:00.000Z");
    expect(
      nextEmailRun(
        "2026-11-19T07:00:00.000Z",
        [{ ...bookmark, reminderAt: "2026-11-18T11:00:00.000Z" }],
        { "m-1": bookmark.reminderAt },
      ),
    ).toBe("2026-11-18T11:00:00.000Z");
  });
});
