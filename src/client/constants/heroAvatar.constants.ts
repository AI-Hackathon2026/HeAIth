import type { HeroStyleKey } from "../types";

export interface HeroStyle {
  id: number;
  key: HeroStyleKey;
  name: string;
  tabLabel: string;
  accent: string;
  accent2: string;
  bg: string;
}

export const HERO_STYLES: HeroStyle[] = [
  {
    id: 0,
    key: "IRON",
    name: "Iron Style",
    tabLabel: "🔴 Iron Style",
    accent: "#e05c2a",
    accent2: "#f0b040",
    bg: "#3a1a0a",
  },
  {
    id: 1,
    key: "DARK",
    name: "Dark Style",
    tabLabel: "🦇 Dark Style",
    accent: "#a0a0c0",
    accent2: "#c8c8e8",
    bg: "#1a1a2a",
  },
  {
    id: 2,
    key: "SPIDER",
    name: "Spider Style",
    tabLabel: "🕷 Spider Style",
    accent: "#cc2222",
    accent2: "#2244cc",
    bg: "#2a0a0a",
  },
];

export const HERO_LEVEL_NAMES: Record<number, string> = {
  1: "고도비만",
  2: "비만",
  3: "과체중 심각",
  4: "과체중",
  5: "약간 과체중",
  6: "정상 체중",
  7: "균형 체형",
  8: "건강 체형",
  9: "근육 체형",
  10: "헬창",
};

export const HERO_XP_THRESHOLDS = [0, 100, 220, 360, 520, 700, 900, 1150, 1450, 1800];

export const HERO_AVATAR_MAX_LEVEL = 10;

/** @deprecated Use DB field `UserCharacterProgress.heroStyle` */
export const HERO_STYLE_STORAGE_KEY = "heaith_hero_style_id";

const HERO_KEY_BY_ID = Object.fromEntries(
  HERO_STYLES.map((style) => [style.id, style.key]),
) as Record<number, HeroStyleKey>;

const HERO_ID_BY_KEY = Object.fromEntries(
  HERO_STYLES.map((style) => [style.key, style.id]),
) as Record<HeroStyleKey, number>;

export function heroStyleKeyToId(key: HeroStyleKey | string | undefined | null): number {
  if (!key) return 0;
  const normalized = key.toUpperCase() as HeroStyleKey;
  return HERO_ID_BY_KEY[normalized] ?? 0;
}

export function heroStyleIdToKey(id: number): HeroStyleKey {
  return HERO_KEY_BY_ID[id] ?? "IRON";
}

export function isHeroStyleKey(value: unknown): value is HeroStyleKey {
  return value === "IRON" || value === "DARK" || value === "SPIDER";
}
