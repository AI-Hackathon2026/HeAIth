export type NutrientGroup = "vitamin" | "mineral" | "macro";

export interface NutrientMeta {
  label: string;
  group: NutrientGroup;
  shortLabel?: string;
}

export const NUTRIENT_GROUP_LABELS: Record<NutrientGroup, string> = {
  vitamin: "비타민",
  mineral: "미네랄",
  macro: "주요 영양소",
};

/** Display order and Korean labels for API nutritionSummary keys. */
export const NUTRIENT_CATALOG: Record<string, NutrientMeta> = {
  "vitamin A": { label: "비타민 A", group: "vitamin" },
  "vitamin C": { label: "비타민 C", group: "vitamin" },
  "vitamin D": { label: "비타민 D", group: "vitamin" },
  calcium: { label: "칼슘", group: "mineral" },
  sodium: { label: "나트륨", group: "mineral" },
  protein: { label: "단백질", group: "macro" },
  carbohydrates: { label: "탄수화물", group: "macro", shortLabel: "탄수" },
  fat: { label: "지방", group: "macro" },
  fiber: { label: "식이섬유", group: "macro" },
  sugar: { label: "당류", group: "macro" },
  cholesterol: { label: "콜레스테롤", group: "macro" },
};

export const NUTRIENT_DISPLAY_ORDER = [
  "vitamin A",
  "vitamin C",
  "vitamin D",
  "calcium",
  "sodium",
  "protein",
  "carbohydrates",
  "fat",
  "fiber",
  "sugar",
  "cholesterol",
] as const;

export const NUTRIENT_GROUP_ORDER: NutrientGroup[] = [
  "vitamin",
  "mineral",
  "macro",
];

/** Fixed palette for nutrition donut segments (matches design spec). */
export const NUTRIENT_DONUT_COLORS: Record<string, string> = {
  "vitamin A": "#F4B740",
  "vitamin C": "#FFD873",
  "vitamin D": "#E08A2B",
  calcium: "#4FC3D9",
  sodium: "#4C8FD9",
  protein: "#FF5C77",
  carbohydrates: "#FF8A4C",
  fat: "#C77DFF",
  fiber: "#6BCB77",
  sugar: "#FF7AC6",
  cholesterol: "#7B9CFF",
};
