import { useCallback, useMemo, useRef, useState } from "react";
import { NUTRIENT_GROUP_ORDER, NUTRIENT_GROUP_LABELS } from "../../../constants/nutrition";
import type { NutrientGroup } from "../../../constants/nutrition";
import type { NutritionSummaryEntry } from "../../../types";
import {
  buildNutritionDonutSegments,
  type NutritionDonutSegment,
} from "../../../utils/nutritionDonut";

interface Props {
  entries: NutritionSummaryEntry[];
  totalCalories: number;
}

interface TooltipState {
  key: string;
  x: number;
  y: number;
}

function groupSegments(segments: NutritionDonutSegment[]) {
  const map = new Map<NutrientGroup, NutritionDonutSegment[]>();

  for (const segment of segments) {
    const bucket = map.get(segment.group) ?? [];
    bucket.push(segment);
    map.set(segment.group, bucket);
  }

  return NUTRIENT_GROUP_ORDER.map((group) => ({
    group,
    label: NUTRIENT_GROUP_LABELS[group],
    segments: map.get(group) ?? [],
  }));
}

export function NutritionDonutChart({ entries, totalCalories }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const segments = useMemo(
    () => buildNutritionDonutSegments(entries),
    [entries],
  );
  const grouped = useMemo(() => groupSegments(segments), [segments]);
  const activeSegment = segments.find((segment) => segment.key === activeKey);

  const positionTooltip = useCallback(
    (key: string, clientX: number, clientY: number) => {
      const rect = wrapRef.current?.getBoundingClientRect();
      if (!rect) return;

      setTooltip({
        key,
        x: clientX - rect.left,
        y: clientY - rect.top,
      });
    },
    [],
  );

  const activate = useCallback(
    (key: string, clientX: number, clientY: number) => {
      setActiveKey(key);
      positionTooltip(key, clientX, clientY);
    },
    [positionTooltip],
  );

  const deactivate = useCallback(() => {
    setActiveKey(null);
    setTooltip(null);
  }, []);

  const handleSegmentPointer = (
    segment: NutritionDonutSegment,
    event: React.MouseEvent | React.TouchEvent,
  ) => {
    if ("touches" in event && event.touches[0]) {
      const touch = event.touches[0];
      activate(segment.key, touch.clientX, touch.clientY);
      return;
    }

    if ("clientX" in event) {
      activate(segment.key, event.clientX, event.clientY);
    }
  };

  const handleRowPointer = (
    segment: NutritionDonutSegment,
    event: React.MouseEvent,
  ) => {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    activate(segment.key, rect.left + rect.width / 2, rect.top);
  };

  if (segments.length === 0) return null;

  return (
    <div className="routine-nutrition-donut-body" ref={wrapRef}>
      <div className="routine-nutrition-donut-chart-col">
        <svg
          className="routine-nutrition-donut-svg"
          viewBox="0 0 320 320"
          aria-hidden
        >
          {segments.map((segment) => {
            const isActive = activeKey === segment.key;
            const isDimmed = activeKey !== null && !isActive;

            return (
              <path
                key={segment.key}
                d={segment.path}
                fill={segment.color}
                className={`routine-nutrition-donut-seg${isActive ? " is-active" : ""}${isDimmed ? " is-dim" : ""}`}
                onMouseEnter={(event) =>
                  activate(segment.key, event.clientX, event.clientY)
                }
                onMouseMove={(event) =>
                  positionTooltip(segment.key, event.clientX, event.clientY)
                }
                onMouseLeave={deactivate}
                onTouchStart={(event) => handleSegmentPointer(segment, event)}
                onTouchEnd={deactivate}
              />
            );
          })}
        </svg>

        <div className="routine-nutrition-donut-center">
          <span className="routine-nutrition-donut-center-label">총 칼로리</span>
          <span className="routine-nutrition-donut-center-value">
            {totalCalories > 0 ? totalCalories.toLocaleString() : "—"}
          </span>
          <span className="routine-nutrition-donut-center-unit">kcal</span>
        </div>
      </div>

      <div className="routine-nutrition-donut-legend">
        {grouped.map(({ group, label, segments: groupSegments }) => (
          <div key={group} className="routine-nutrition-donut-legend-col">
            <p className="routine-nutrition-donut-legend-label">{label}</p>
            <div className="routine-nutrition-donut-rows">
              {groupSegments.map((segment) => {
                const isActive = activeKey === segment.key;
                const isDimmed = activeKey !== null && !isActive;

                return (
                  <div
                    key={segment.key}
                    className={`routine-nutrition-donut-row${isActive ? " is-active" : ""}${isDimmed ? " is-dim" : ""}`}
                    onMouseEnter={(event) => handleRowPointer(segment, event)}
                    onMouseLeave={deactivate}
                  >
                    <span
                      className="routine-nutrition-donut-dot"
                      style={{ background: segment.color }}
                      aria-hidden
                    />
                    <span className="routine-nutrition-donut-row-name">
                      {segment.name}
                    </span>
                    <span
                      className="routine-nutrition-donut-row-pct"
                      style={{ color: segment.color }}
                    >
                      {segment.percent}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {activeSegment && tooltip && (
        <div
          className="routine-nutrition-donut-tooltip is-visible"
          style={{ left: tooltip.x, top: tooltip.y }}
          role="tooltip"
        >
          <p className="routine-nutrition-donut-tooltip-text">
            {activeSegment.name}{" "}
            <span style={{ color: activeSegment.color }}>
              {activeSegment.percent}%
            </span>
          </p>
        </div>
      )}
    </div>
  );
}
