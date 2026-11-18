import { Cloud, HardDrive, LoaderCircle, ShieldCheck, Zap } from "lucide-react";
import { useAIStatus } from "../aiStatus";
import type { ModelEvidence } from "../types";

export function ModelBadge({ compact = false }: { compact?: boolean }) {
  const status = useAIStatus();
  const working = status.phase === "working" || status.phase === "preparing";
  const Icon = working
    ? LoaderCircle
    : status.phase === "review"
      ? ShieldCheck
      : status.location === "cloud"
        ? Cloud
        : status.model === "Gemini Nano"
          ? Zap
          : HardDrive;
  return (
    <span
      className={`live-model-badge model-${status.location} model-${status.phase} ${compact ? "compact" : ""}`}
      role="status"
      aria-live="polite"
      title={`${status.detail}${status.model ? ` Model: ${status.model}.` : ""}`}
      data-testid="live-model-badge"
      data-phase={status.phase}
      data-inference-location={status.location}
    >
      <Icon size={compact ? 13 : 15} className={working ? "spin" : ""} />
      <span>{status.label}</span>
    </span>
  );
}

export function ModelReceipt({ evidence }: { evidence: ModelEvidence }) {
  return (
    <span
      className={`model-receipt model-${evidence.inferenceSource === "cloud" ? "cloud" : "device"}`}
      title={`The Firebase SDK confirmed ${evidence.inferenceSource} inference on ${new Date(evidence.verifiedAt).toLocaleString()}.`}
      data-testid="model-receipt"
    >
      {evidence.inferenceSource === "cloud" ? (
        <Cloud size={13} />
      ) : (
        <Zap size={13} />
      )}
      <span>
        {evidence.inferenceSource === "cloud"
          ? cloudLabel(evidence.name)
          : "Gemini Nano"}{" "}
        · {evidence.inferenceSource === "cloud" ? "cloud" : "on device"}
      </span>
      <ShieldCheck size={12} />
    </span>
  );
}

function cloudLabel(name: string) {
  return name.replace(/^gemini-/i, "Gemini ").replaceAll("-", " ");
}
