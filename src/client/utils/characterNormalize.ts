import { AVATAR_XP_PER_LEVEL } from "../constants/avatar.constants";
import { isHeroStyleKey } from "../constants/heroAvatar.constants";
import type { CharacterProgress, HeroStyleKey } from "../types";
import { defaultCharacterProgress } from "./avatarData";

function computeXpFields(xp: number) {
  const xpInLevel = xp % AVATAR_XP_PER_LEVEL;
  return {
    xpInLevel,
    xpToNext: AVATAR_XP_PER_LEVEL - xpInLevel,
  };
}

export function normalizeCharacterProgress(raw: unknown): CharacterProgress | null {
  if (!raw || typeof raw !== "object") return null;

  const data = raw as Record<string, unknown>;
  const level = Number(data.level);
  const xp = Number(data.xp);

  if (Number.isNaN(level) || Number.isNaN(xp)) return null;

  const xpInLevelRaw = data.xpInLevel;
  const xpToNextRaw = data.xpToNext;
  const xpFields =
    typeof xpInLevelRaw === "number" && typeof xpToNextRaw === "number"
      ? { xpInLevel: xpInLevelRaw, xpToNext: xpToNextRaw }
      : computeXpFields(xp);

  const stageRaw = data.stage;
  const stage =
    stageRaw && typeof stageRaw === "object"
      ? {
          key: String((stageRaw as Record<string, unknown>).key ?? ""),
          name: String((stageRaw as Record<string, unknown>).name ?? "새싹"),
          emoji: String((stageRaw as Record<string, unknown>).emoji ?? "🌱"),
        }
      : { name: "새싹", emoji: "🌱" };

  const heroStyleRaw = data.heroStyle ?? data.hero_style;
  const heroStyle: HeroStyleKey = isHeroStyleKey(heroStyleRaw)
    ? heroStyleRaw
    : typeof heroStyleRaw === "string" && isHeroStyleKey(heroStyleRaw.toUpperCase())
      ? (heroStyleRaw.toUpperCase() as HeroStyleKey)
      : "IRON";

  return {
    level,
    xp,
    ...xpFields,
    totalCompletions: Number(data.totalCompletions ?? 0) || 0,
    stage,
    heroStyle,
  };
}

export function extractCharacterProgress(raw: unknown): CharacterProgress | null {
  if (!raw || typeof raw !== "object") return null;

  const data = raw as Record<string, unknown>;
  const direct = normalizeCharacterProgress(data.characterProgress);
  if (direct) return direct;

  if (typeof data.level === "number" && typeof data.xp === "number") {
    return normalizeCharacterProgress(data);
  }

  return null;
}

export function normalizeCharacterProgressOrDefault(
  raw: unknown,
): CharacterProgress {
  return extractCharacterProgress(raw) ?? defaultCharacterProgress();
}
