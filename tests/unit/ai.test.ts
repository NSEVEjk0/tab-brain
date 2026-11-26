import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AIConfig } from "../../src/types";
import { memory } from "./fixtures";
import { previewCloud } from "../../src/library";

const mocks = vi.hoisted(() => ({
  initializeApp: vi.fn(() => ({ name: "test-app" })),
  deleteApp: vi.fn(async () => undefined),
  appCheck: vi.fn((app: unknown) => ({ app })),
  getToken: vi.fn(),
  getAI: vi.fn(() => ({})),
  localInitialize: vi.fn(async (progress: (value: number) => void) =>
    progress(0.5),
  ),
  localGenerate: vi.fn(),
  cloudGenerate: vi.fn(),
  model: vi.fn(),
}));
vi.mock("firebase/app", () => ({
  initializeApp: mocks.initializeApp,
  deleteApp: mocks.deleteApp,
}));
vi.mock("firebase/app-check", () => ({
  initializeAppCheck: mocks.appCheck,
  getToken: mocks.getToken,
  CustomProvider: class {},
  ReCaptchaEnterpriseProvider: class {
    constructor(public key: string) {}
  },
}));
vi.mock("firebase/ai", () => ({
  getAI: mocks.getAI,
  GoogleAIBackend: class {},
  InferenceMode: {
    ONLY_ON_DEVICE: "only_on_device",
    ONLY_IN_CLOUD: "only_in_cloud",
  },
  InferenceSource: { ON_DEVICE: "on_device", IN_CLOUD: "in_cloud" },
  getGenerativeModel: (...args: unknown[]) => {
    mocks.model(...args);
    return (args[1] as { mode: string }).mode === "only_on_device"
      ? {
          initializeDeviceModel: mocks.localInitialize,
          generateContent: mocks.localGenerate,
        }
      : { generateContent: mocks.cloudGenerate };
  },
}));
let ai: typeof import("../../src/ai");
const config: AIConfig = {
  firebase: {
    apiKey: "TEST_NOT_A_REAL_KEY",
    projectId: "test-project",
    appId: "test-app",
  },
  appCheckMode: "debug",
  siteKey: "",
  model: "gemini-3.5-flash-lite",
};
const tokens = new Map<string, string>();
beforeEach(async () => {
  vi.resetModules();
  vi.clearAllMocks();
  mocks.getToken.mockResolvedValue({
    token: "TEST.NOT_A_REAL_TOKEN.SIGNATURE",
  });
  mocks.localGenerate.mockResolvedValue({
    response: {
      inferenceSource: "on_device",
      text: () =>
        '{"summary":"Saved pages stay on this device. Offline search keeps them available.","tags":["reading","offline","privacy"],"excerpts":[]}',
    },
  });
  tokens.clear();
  tokens.set("tab-brain-appcheck-token", "TEST_NOT_A_REAL_TOKEN");
  vi.stubGlobal("sessionStorage", {
    getItem: (key: string) => tokens.get(key) ?? null,
  });
  vi.stubGlobal("location", {
    protocol: "https:",
    origin: "https://example.com",
  });
  ai = await import("../../src/ai");
});
describe("explicit Firebase inference boundaries (SDK mocked)", () => {
  it("uses separate Firebase apps for device-only capture and cloud comparison", async () => {
    await ai.initializeLocal(() => undefined);
    expect(mocks.appCheck).not.toHaveBeenCalled();
    await ai.verifyConnection(config);
    expect(
      mocks.model.mock.calls.map((call) => (call[1] as { mode: string }).mode),
    ).toEqual(["only_on_device", "only_in_cloud"]);
    expect(mocks.initializeApp).toHaveBeenCalledTimes(2);
    expect(mocks.appCheck).toHaveBeenCalledTimes(1);
    expect(mocks.cloudGenerate).not.toHaveBeenCalled();
  });
  it("runs local summaries without a cloud connection", async () => {
    tokens.clear();
    await ai.initializeLocal(() => undefined);
    const saved = await ai.summarizeLocally(memory());
    expect(saved.modelEvidence?.inferenceSource).toBe("on-device");
    expect(mocks.appCheck).not.toHaveBeenCalled();
    expect(mocks.getToken).not.toHaveBeenCalled();
    expect(mocks.cloudGenerate).not.toHaveBeenCalled();
  });
  it("requires a registered session token before a development cloud request", async () => {
    tokens.clear();
    const preview = previewCloud("Question", [memory()]);
    await expect(
      ai.askCloud(preview, config, preview.requestText),
    ).rejects.toThrow("development token");
    expect(mocks.getToken).not.toHaveBeenCalled();
    expect(mocks.cloudGenerate).not.toHaveBeenCalled();
  });
  it("blocks cloud inference if the payload differs from the reviewed request", async () => {
    const preview = previewCloud("Question", [memory()]);
    await expect(
      ai.askCloud(preview, config, "different sources"),
    ).rejects.toThrow("changed after review");
    expect(mocks.cloudGenerate).not.toHaveBeenCalled();
    expect(mocks.getToken).not.toHaveBeenCalled();
  });
  it("keeps approved source text out of a generation request when browser verification fails", async () => {
    mocks.getToken.mockRejectedValueOnce(
      new Error("AppCheck: ReCAPTCHA error. (appCheck/recaptcha-error)."),
    );
    const preview = previewCloud("Question", [memory()]);
    await expect(
      ai.askCloud(preview, config, preview.requestText),
    ).rejects.toThrow("ReCAPTCHA");
    expect(mocks.cloudGenerate).not.toHaveBeenCalled();
  });
  it("refuses the unsigned placeholder token that can follow an App Check failure", async () => {
    mocks.getToken.mockResolvedValueOnce({
      token: "TEST_NOT_A_SIGNED_APPCHECK_TOKEN",
    });
    const preview = previewCloud("Question", [memory()]);
    await expect(
      ai.askCloud(preview, config, preview.requestText),
    ).rejects.toThrow("no valid token");
    expect(mocks.cloudGenerate).not.toHaveBeenCalled();
  });
  it("can verify the browser without running either model", async () => {
    await ai.verifyConnection(config);
    expect(mocks.getToken).toHaveBeenCalledWith(expect.anything(), true);
    expect(mocks.cloudGenerate).not.toHaveBeenCalled();
    expect(mocks.localGenerate).not.toHaveBeenCalled();
    expect(mocks.localInitialize).not.toHaveBeenCalled();
  });
  it("times out when verification stalls and keeps the approved snippets local", async () => {
    vi.useFakeTimers();
    try {
      mocks.getToken.mockImplementationOnce(() => new Promise(() => {}));
      const preview = previewCloud("Question", [memory()]);
      const error = expect(
        ai.askCloud(preview, config, preview.requestText),
      ).rejects.toThrow("Browser verification timed out");
      await vi.advanceTimersByTimeAsync(20_000);
      await error;
      expect(mocks.cloudGenerate).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });
  it("distinguishes the local API-not-enabled error from a disabled Firebase service", () => {
    expect(
      ai.friendlyError(
        new Error(
          "Local LanguageModel API not available in this environment. (AI/api-not-enabled)",
        ),
      ),
    ).toContain("On-device AI is unavailable");
    expect(
      ai.friendlyError(
        new Error(
          "Firebase AI Logic API has not been used before or it is disabled. (AI/api-not-enabled)",
        ),
      ),
    ).toContain("Firebase AI Logic is not enabled");
    expect(
      ai.friendlyError(
        new Error("AppCheck: ReCAPTCHA error. (appCheck/recaptcha-error)."),
      ),
    ).toContain("Browser verification failed");
    expect(
      ai.friendlyError(
        new Error("AppCheck: HTTP status: 403. (appCheck/initial-throttle)."),
      ),
    ).toContain("Firebase App Check rejected this browser (403)");
  });
  it("does not label a cloud response as an on-device summary", async () => {
    await ai.initializeLocal(() => undefined);
    mocks.localGenerate.mockResolvedValue({
      response: {
        inferenceSource: "in_cloud",
        text: () =>
          '{"summary":"A useful summary. A second sentence.","tags":["one","two","three"]}',
      },
    });
    await expect(ai.summarizeLocally(memory())).rejects.toThrow(
      "on-device",
    );
    expect(mocks.cloudGenerate).not.toHaveBeenCalled();
  });
  it("keeps local AI disabled when an exposed API only echoes its input", async () => {
    mocks.localGenerate.mockImplementation(async (input: string) => ({
      response: {
        inferenceSource: "on_device",
        text: () =>
          "On-device model is not available in Chromium, this API is just echoing back the input:\n" +
          input,
      },
    }));
    await expect(ai.initializeLocal(() => undefined)).rejects.toThrow(
      "verified on-device summary",
    );
    expect(ai.localModelReady()).toBe(false);
    expect(mocks.cloudGenerate).not.toHaveBeenCalled();
    expect(mocks.getToken).not.toHaveBeenCalled();
  });
  it("keeps Nano ready when the separate cloud connection is removed", async () => {
    let finish!: () => void;
    mocks.localInitialize.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    const pending = ai.initializeLocal(() => undefined);
    await ai.verifyConnection(config);
    ai.resetCloudConnection();
    finish();
    await pending;
    const saved = await ai.summarizeLocally(memory());
    expect(saved.modelEvidence?.inferenceSource).toBe("on-device");
    expect(ai.localModelReady()).toBe(true);
    expect(mocks.cloudGenerate).not.toHaveBeenCalled();
  });
  it("keeps approved snippets local if the connection is withdrawn while verification is pending", async () => {
    let finish!: (value: { token: string }) => void;
    mocks.getToken.mockImplementationOnce(
      () =>
        new Promise<{ token: string }>((resolve) => {
          finish = resolve;
        }),
    );
    const preview = previewCloud("What is useful?", [memory()]);
    const pending = ai.askCloud(preview, config, preview.requestText);
    ai.resetCloudConnection();
    finish({ token: "TEST.NOT_A_REAL_TOKEN.SIGNATURE" });
    await expect(pending).rejects.toThrow("connection changed");
    expect(mocks.cloudGenerate).not.toHaveBeenCalled();
  });
  it("keeps only verbatim source excerpts from a local model response", async () => {
    await ai.initializeLocal(() => undefined);
    mocks.localGenerate.mockResolvedValue({
      response: {
        inferenceSource: "on_device",
        text: () =>
          JSON.stringify({
            summary: "A useful summary. Another useful sentence.",
            tags: ["research", "notes", "facts"],
            excerpts: [
              "The useful detail is preserved in this original page text.",
              "This invented quote must not be kept in the source record.",
            ],
          }),
      },
    });
    const summarized = await ai.summarizeLocally(memory());
    expect(summarized.analysis).toBe("on-device");
    expect(summarized.excerpts).toEqual([
      "The useful detail is preserved in this original page text.",
    ]);
    expect(summarized.tags).toHaveLength(3);
    expect(summarized.modelEvidence).toMatchObject({
      name: "Gemini Nano",
      inferenceSource: "on-device",
    });
  });
  it("rejects summaries that do not contain two sentences and three tags", async () => {
    await ai.initializeLocal(() => undefined);
    mocks.localGenerate.mockResolvedValue({
      response: {
        inferenceSource: "on_device",
        text: () => '{"summary":"One sentence.","tags":["research"]}',
      },
    });
    await expect(ai.summarizeLocally(memory())).rejects.toThrow(
      "two summary sentences",
    );
  });
  it("sends only the approved snippets and verifies cloud execution and citations", async () => {
    const preview = previewCloud("What is useful?", [memory()]);
    mocks.cloudGenerate.mockResolvedValue({
      response: {
        inferenceSource: "in_cloud",
        text: () =>
          '{"answer":"The captured detail is useful [1].","unknowns":[]}',
      },
    });
    const approvedText = preview.requestText;
    const pendingResponse = ai.askCloud(preview, config, approvedText);
    preview.requestText = "CHANGED_WHILE_BROWSER_VERIFICATION_WAS_PENDING";
    const response = await pendingResponse;
    expect(response.answer).toContain("[1]");
    expect(response.modelEvidence).toMatchObject({
      name: config.model,
      inferenceSource: "cloud",
    });
    expect(mocks.cloudGenerate.mock.calls[0][0]).toContain(approvedText);
    expect(mocks.cloudGenerate.mock.calls[0][0]).not.toContain(
      "CHANGED_WHILE_BROWSER_VERIFICATION_WAS_PENDING",
    );
    expect(mocks.localGenerate).not.toHaveBeenCalled();
  });
});
