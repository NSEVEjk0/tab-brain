import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AIConfig } from "../../src/types";
import { memory } from "./fixtures";
import { previewCloud } from "../../src/library";

const mocks = vi.hoisted(() => ({
  initializeApp: vi.fn(() => ({ name: "test-app" })),
  deleteApp: vi.fn(async () => undefined),
  appCheck: vi.fn(),
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
  tokens.clear();
  tokens.set("tab-brain-appcheck-token", "TEST_NOT_A_REAL_TOKEN");
  vi.stubGlobal("sessionStorage", {
    getItem: (key: string) => tokens.get(key) ?? null,
  });
  vi.stubGlobal("location", {
    protocol: "https:",
    origin: "https://example.com",
  });
  vi.stubGlobal("self", {});
  ai = await import("../../src/ai");
});
describe("explicit Firebase inference boundaries (SDK mocked)", () => {
  it("creates a device-only capture model and a separate cloud-only model", () => {
    ai.configureModels(config);
    expect(
      mocks.model.mock.calls.map((call) => (call[1] as { mode: string }).mode),
    ).toEqual(["only_on_device", "only_in_cloud"]);
    expect(mocks.appCheck).toHaveBeenCalled();
    expect(mocks.localGenerate).not.toHaveBeenCalled();
    expect(mocks.cloudGenerate).not.toHaveBeenCalled();
  });
  it("refuses to initialize an unregistered development configuration without its session token", () => {
    tokens.clear();
    expect(() => ai.configureModels(config)).toThrow("development token");
    expect(mocks.getAI).not.toHaveBeenCalled();
  });
  it("blocks cloud inference if the payload differs from the reviewed request", async () => {
    const preview = previewCloud("Question", [memory()]);
    await expect(
      ai.askCloud(preview, config, "different sources"),
    ).rejects.toThrow("changed after review");
    expect(mocks.cloudGenerate).not.toHaveBeenCalled();
  });
  it("does not label a cloud response as an on-device summary", async () => {
    await ai.initializeLocal(config, () => undefined);
    mocks.localGenerate.mockResolvedValue({
      response: {
        inferenceSource: "in_cloud",
        text: () =>
          '{"summary":"A useful summary. A second sentence.","tags":["one","two","three"]}',
      },
    });
    await expect(ai.summarizeLocally(memory(), config)).rejects.toThrow(
      "on-device",
    );
    expect(mocks.cloudGenerate).not.toHaveBeenCalled();
  });
  it("keeps only verbatim source excerpts from a local model response", async () => {
    await ai.initializeLocal(config, () => undefined);
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
    const summarized = await ai.summarizeLocally(memory(), config);
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
    await ai.initializeLocal(config, () => undefined);
    mocks.localGenerate.mockResolvedValue({
      response: {
        inferenceSource: "on_device",
        text: () => '{"summary":"One sentence.","tags":["research"]}',
      },
    });
    await expect(ai.summarizeLocally(memory(), config)).rejects.toThrow(
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
    const response = await ai.askCloud(preview, config, preview.requestText);
    expect(response.answer).toContain("[1]");
    expect(response.modelEvidence).toMatchObject({
      name: config.model,
      inferenceSource: "cloud",
    });
    expect(mocks.cloudGenerate.mock.calls[0][0]).toContain(preview.requestText);
    expect(mocks.localGenerate).not.toHaveBeenCalled();
  });
});
