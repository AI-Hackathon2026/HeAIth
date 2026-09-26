import { CharacterStage, HeroStyle } from "@/server/shared/types/enums";
import { CharacterProgressView } from "../view/character.view";
import { STAGE_META, toXpProgress } from "../../../shared/utils/character-progress.util";

export class CharacterMapper {
    static toProgressView(row: {
        level: number;
        xp: number;
        stage: CharacterStage;
        heroStyle: HeroStyle;
        totalCompletions: number;
    }): CharacterProgressView {
        const { xpInLevel, xpToNext } = toXpProgress(row.xp);
        const stageMeta = STAGE_META[row.stage];

        return {
            level: row.level,
            xp: row.xp,
            xpInLevel,
            xpToNext,
            heroStyle: row.heroStyle,
            stage: {
                key: row.stage,
                name: stageMeta.name,
                emoji: stageMeta.emoji,
            },
            totalCompletions: row.totalCompletions,
        };
    }
}
