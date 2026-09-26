import {
  NUTRIENT_DONUT_COLORS,
  NUTRIENT_GROUP_LABELS,
} from "../constants/nutrition";
import type { NutrientGroup } from "../constants/nutrition";
import type { NutritionSummaryEntry } from "../types";
import {
  getNutrientGroup,
  getNutrientLabel,
  sortNutritionSummaryEntries,
} from "./nutritionSummary";

const CX = 160;
const CY = 160;
const OUTER_R = 138;
const INNER_R = 94;
const GAP_DEG = 2.2;

export interface NutritionDonutSegment {
  key: string;
  name: string;
  percent: number;
  color: string;
  group: NutrientGroup;
  groupLabel: string;
  path: string;
}

function polar(cx: number, cy: number, radius: number, angleDeg: number) {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(angleRad),
    y: cy + radius * Math.sin(angleRad),
  };
}

function segmentPath(startAngle: number, endAngle: number): string {
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  const outerStart = polar(CX, CY, OUTER_R, endAngle);
  const outerEnd = polar(CX, CY, OUTER_R, startAngle);
  const innerEnd = polar(CX, CY, INNER_R, startAngle);
  const innerStart = polar(CX, CY, INNER_R, endAngle);

  return [
    `M ${outerStart.x.toFixed(2)} ${outerStart.y.toFixed(2)}`,
    `A ${OUTER_R} ${OUTER_R} 0 ${largeArc} 0 ${outerEnd.x.toFixed(2)} ${outerEnd.y.toFixed(2)}`,
    `L ${innerEnd.x.toFixed(2)} ${innerEnd.y.toFixed(2)}`,
    `A ${INNER_R} ${INNER_R} 0 ${largeArc} 1 ${innerStart.x.toFixed(2)} ${innerStart.y.toFixed(2)}`,
    "Z",
  ].join(" ");
}

export function getNutrientDonutColor(key: string): string {
  return NUTRIENT_DONUT_COLORS[key] ?? "#8892a8";
}

export function buildNutritionDonutSegments(
  entries: NutritionSummaryEntry[],
): NutritionDonutSegment[] {
  const sorted = sortNutritionSummaryEntries(entries);
  const weightTotal = sorted.reduce((sum, entry) => sum + entry.percent, 0);
  if (weightTotal <= 0) return [];

  let angle = 0;

  return sorted.map((entry) => {
    const sweep = (entry.percent / weightTotal) * 360;
    const startAngle = angle + GAP_DEG / 2;
    const endAngle = angle + sweep - GAP_DEG / 2;
    angle += sweep;

    const group = getNutrientGroup(entry.key);

    return {
      key: entry.key,
      name: getNutrientLabel(entry.key),
      percent: entry.percent,
      color: getNutrientDonutColor(entry.key),
      group,
      groupLabel: NUTRIENT_GROUP_LABELS[group],
      path: segmentPath(startAngle, endAngle),
    };
  });
}
