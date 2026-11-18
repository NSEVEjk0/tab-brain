import { useSyncExternalStore } from "react";

export interface AIStatus {
  phase: "idle" | "preparing" | "working" | "review" | "complete" | "error";
  location: "device" | "cloud";
  label: string;
  detail: string;
  model?: string;
}

const initial: AIStatus = {
  phase: "idle",
  location: "device",
  label: "Local AI not enabled",
  detail: "Saved text and keyword search work on this device.",
};
let status: AIStatus = initial;
const listeners = new Set<() => void>();

export function publishAIStatus(next: AIStatus) {
  status = next;
  listeners.forEach((listener) => listener());
}
export function getAIStatus() {
  return status;
}
export function subscribeAIStatus(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
export function useAIStatus() {
  return useSyncExternalStore(subscribeAIStatus, getAIStatus, getAIStatus);
}
export function cloudModelName(model: string): string {
  if (/flash-lite/i.test(model)) return "Gemini Flash Lite";
  if (/flash/i.test(model)) return "Gemini Flash";
  if (/pro/i.test(model)) return "Gemini Pro";
  return model;
}
export function localTextStatus(
  detail = "Saving readable text and excerpts on this device.",
) {
  publishAIStatus({
    phase: "working",
    location: "device",
    label: "Saving text · on device",
    detail,
  });
}
export function awaitingCloudApproval(model?: string) {
  publishAIStatus({
    phase: "review",
    location: "device",
    label: "Sources ready · awaiting approval",
    detail: "Review the selected snippets before sending your question.",
    model,
  });
}
export function idleAIStatus(deviceReady: boolean) {
  publishAIStatus(
    deviceReady
      ? {
          phase: "idle",
          location: "device",
          label: "Gemini Nano · ready",
          detail: "The on-device model has been initialized in this browser.",
          model: "Gemini Nano",
        }
      : initial,
  );
}
