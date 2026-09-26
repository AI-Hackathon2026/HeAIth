import { CharacterStage, HeroStyle } from "@/server/shared/types/enums";

export interface CharacterStageView {
    key: CharacterStage;
    name: string;
    emoji: string;
}

export interface CharacterProgressView {
    level: number;
    xp: number;
    xpInLevel: number;
    xpToNext: number;
    heroStyle: HeroStyle;
    stage: CharacterStageView;
    totalCompletions: number;
}

export interface CharacterSummaryView {
    level: number;
    xp: number;
    stage: Pick<CharacterStageView, "name" | "emoji">;
}
