import { CharacterStage, HeroStyle } from "@/server/shared/types/enums";

export const XP_PER_COMPLETION = 25;
export const XP_PER_LEVEL = 100;
export const MAX_LEVEL = 10;

export const STAGE_META: Record<
    CharacterStage,
    { name: string; emoji: string }
> = {
    SPROUT: { name: "새싹", emoji: "🌱" },
    GROWTH: { name: "성장", emoji: "🌿" },
    SKILLED: { name: "숙련", emoji: "💪" },
    CHAMPION: { name: "챔피언", emoji: "🏆" },
    MASTER: { name: "마스터", emoji: "👑" },
};

export function calculateLevel(xp: number): number {
    return Math.min(MAX_LEVEL, Math.floor(xp / XP_PER_LEVEL) + 1);
}

export function calculateStage(level: number): CharacterStage {
    if (level >= 10) return "MASTER";
    if (level >= 8) return "CHAMPION";
    if (level >= 5) return "SKILLED";
    if (level >= 3) return "GROWTH";
    return "SPROUT";
}

export type CharacterProgressRow = {
    level: number;
    xp: number;
    stage: CharacterStage;
    heroStyle: HeroStyle;
    totalCompletions: number;
};

export function applyXp(
    current: CharacterProgressRow,
    xpToAdd: number,
): Pick<CharacterProgressRow, "level" | "xp" | "stage" | "totalCompletions"> {
    const xp = current.xp + xpToAdd;
    const level = calculateLevel(xp);

    return {
        xp,
        level,
        stage: calculateStage(level),
        totalCompletions: current.totalCompletions + 1,
    };
}

export function toXpProgress(xp: number) {
    const level = calculateLevel(xp);
    const xpInLevel = xp % XP_PER_LEVEL;
    if (level >= MAX_LEVEL) {
        return { xpInLevel, xpToNext: 0 };
    }
    return {
        xpInLevel,
        xpToNext: XP_PER_LEVEL - xpInLevel,
    };
}
