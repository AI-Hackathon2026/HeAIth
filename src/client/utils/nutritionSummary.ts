import {
  NUTRIENT_CATALOG,
  NUTRIENT_DISPLAY_ORDER,
  NUTRIENT_GROUP_ORDER,
  type NutrientGroup,
} from "../constants/nutrition";
import type { MealType, NutritionSummaryEntry } from "../types";

function clampPercent(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}

export interface NutrientRate {
  key: string;
  name: string;
  value: number;
}

export function parseNutrientPercent(raw: unknown): number | null {
  if (typeof raw === "number" && !Number.isNaN(raw)) {
    return clampPercent(raw);
  }

  const text = String(raw ?? "").trim();
  if (!text) return null;

  const match = text.match(/(\d+(?:\.\d+)?)/);
  if (!match) return null;

  return clampPercent(Number(match[1]));
}

export function normalizeNutritionSummary(
  raw: unknown,
): NutritionSummaryEntry[] | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;

  const entries: NutritionSummaryEntry[] = [];

  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    const percent = parseNutrientPercent(value);
    if (percent === null) continue;
    entries.push({ key, percent });
  }

  return entries.length > 0 ? entries : undefined;
}

export function sortNutritionSummaryEntries(
  entries: NutritionSummaryEntry[],
): NutritionSummaryEntry[] {
  const order = new Map<string, number>(
    NUTRIENT_DISPLAY_ORDER.map((key, index) => [key, index]),
  );

  return [...entries].sort((a, b) => {
    const indexA = order.get(a.key) ?? Number.MAX_SAFE_INTEGER;
    const indexB = order.get(b.key) ?? Number.MAX_SAFE_INTEGER;
    if (indexA !== indexB) return indexA - indexB;
    return a.key.localeCompare(b.key);
  });
}

export function getNutrientLabel(key: string): string {
  return NUTRIENT_CATALOG[key]?.label ?? key;
}

export function getNutrientGroup(key: string): NutrientGroup {
  return NUTRIENT_CATALOG[key]?.group ?? "macro";
}

export function toNutrientRates(
  entries: NutritionSummaryEntry[],
): NutrientRate[] {
  return sortNutritionSummaryEntries(entries).map((entry) => ({
    key: entry.key,
    name: getNutrientLabel(entry.key),
    value: entry.percent,
  }));
}

export function getTopNutrients(rates: NutrientRate[]): {
  featured: NutrientRate[];
  rest: NutrientRate[];
} {
  if (rates.length === 0) {
    return { featured: [], rest: [] };
  }

  const sortedDesc = [...rates].sort((a, b) => b.value - a.value);
  const perfect = sortedDesc.filter((rate) => rate.value >= 100).slice(0, 1);
  const worst = [...rates].sort((a, b) => a.value - b.value).slice(0, 2);

  const featuredKeys = new Set(
    [...perfect, ...worst].map((rate) => rate.key),
  );
  const featured = rates.filter((rate) => featuredKeys.has(rate.key)).slice(0, 3);
  const rest = rates.filter((rate) => !featuredKeys.has(rate.key));

  return { featured, rest };
}

export function groupNutritionSummaryEntries(entries: NutritionSummaryEntry[]) {
  const sorted = sortNutritionSummaryEntries(entries);
  const groups = new Map<NutrientGroup, NutritionSummaryEntry[]>();

  for (const entry of sorted) {
    const group = getNutrientGroup(entry.key);
    const bucket = groups.get(group) ?? [];
    bucket.push(entry);
    groups.set(group, bucket);
  }

  return NUTRIENT_GROUP_ORDER.filter((group) => groups.has(group)).map(
    (group) => ({
      group,
      entries: groups.get(group)!,
    }),
  );
}

export function averageNutritionFulfillment(
  entries: NutritionSummaryEntry[],
): number {
  if (entries.length === 0) return 0;
  const total = entries.reduce((sum, entry) => sum + entry.percent, 0);
  return Math.round(total / entries.length);
}

export function getNutrientColor(value: number): string {
  if (value >= 90) return "#00c9a7";
  if (value >= 70) return "#f0a030";
  return "#ff6b6b";
}

export function getNutrientStatus(value: number): "good" | "caution" | "warn" {
  if (value >= 90) return "good";
  if (value >= 70) return "caution";
  return "warn";
}

/** @deprecated use getNutrientColor */
export function nutrientFulfillmentColor(percent: number): string {
  return getNutrientColor(percent);
}

export function nutrientFulfillmentLabel(percent: number): string {
  if (percent >= 90) return "좋음";
  if (percent >= 70) return "보통";
  return "부족";
}

export function getCurrentMealType(): MealType | null {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 11) return "BREAKFAST";
  if (hour >= 11 && hour < 17) return "LUNCH";
  if (hour >= 17 && hour < 22) return "DINNER";
  return null;
}

export function resolveDayTotalCalories(
  averageCalories: number | undefined,
  mealCalories: number,
): number {
  if (mealCalories > 0) return mealCalories;
  if (averageCalories && averageCalories > 0) return averageCalories;
  return 0;
}
