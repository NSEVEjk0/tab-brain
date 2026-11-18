import type { Memory } from "../types";
import { useMemo } from "react";
import { ArrowUpRight } from "lucide-react";

export function TopicMap({
  memories,
  onTag,
  compact = false,
}: {
  memories: Memory[];
  onTag: (tag: string) => void;
  compact?: boolean;
}) {
  const topics = useMemo(() => {
    const counts = new Map<string, number>();
    memories.forEach((m) =>
      m.tags.forEach((tag) => counts.set(tag, (counts.get(tag) ?? 0) + 1)),
    );
    return [...counts].sort((a, b) => b[1] - a[1]).slice(0, compact ? 5 : 12);
  }, [memories, compact]);
  const positions = compact
    ? [
        [145, 76],
        [63, 150],
        [224, 154],
        [113, 224],
        [230, 247],
      ]
    : [
        [310, 190],
        [130, 110],
        [480, 110],
        [145, 290],
        [470, 300],
        [310, 375],
        [290, 55],
        [65, 220],
        [552, 220],
        [100, 400],
        [520, 420],
        [310, 490],
      ];
  return (
    <div className={`topic-map ${compact ? "compact-map" : ""}`}>
      <svg
        viewBox={compact ? "0 0 290 310" : "0 0 620 550"}
        role="group"
        aria-label="Topics in your saved library"
      >
        <defs>
          <pattern
            id={compact ? "compactDots" : "mapDots"}
            width="18"
            height="18"
            patternUnits="userSpaceOnUse"
          >
            <circle cx="1" cy="1" r=".8" fill="#d7dfce" />
          </pattern>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill={`url(#${compact ? "compactDots" : "mapDots"})`}
        />
        {topics.map(([tag, count], index) => (
          <g
            key={tag}
            className="topic-node"
            role="button"
            tabIndex={0}
            aria-label={`Filter ${tag}, ${count} memories`}
            transform={`translate(${positions[index][0]},${positions[index][1]})`}
            onClick={() => onTag(tag)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onTag(tag);
              }
            }}
          >
            <circle
              r={index === 0 ? (compact ? 37 : 51) : compact ? 27 : 37}
              fill={
                ["#d2e8b8", "#dfd6ed", "#d4e4ed", "#f0dfc6", "#e9d8d3"][
                  index % 5
                ]
              }
              stroke="#f9faf6"
              strokeWidth="5"
            />
            <text
              textAnchor="middle"
              y={-2}
              fontSize={compact ? 10 : 12}
              fill="#33442d"
            >
              {tag.length > (compact ? 10 : 14)
                ? tag.slice(0, compact ? 9 : 13) + "…"
                : tag}
            </text>
            <text textAnchor="middle" y={13} fontSize="9" fill="#6c7c5f">
              {count} {count === 1 ? "memory" : "memories"}
            </text>
          </g>
        ))}
      </svg>
      {!topics.length && (
        <p className="map-empty">
          Your topics will grow here as you save pages.
        </p>
      )}
      {!compact && (
        <p className="map-caption">
          <span className="tiny-dot" /> Your most-used topics. Click one to see
          its saved pages. <ArrowUpRight size={14} />
        </p>
      )}
    </div>
  );
}
