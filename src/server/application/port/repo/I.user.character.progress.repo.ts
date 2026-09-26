import { CharacterStage, HeroStyle } from "@/server/shared/types/enums";

export type UserCharacterProgressRow = {
    id: string;
    userId: string;
    level: number;
    xp: number;
    stage: CharacterStage;
    heroStyle: HeroStyle;
    totalCompletions: number;
};

export interface IUserCharacterProgressQueryRepo {
    findByUserId(userId: string): Promise<UserCharacterProgressRow | null>;
}

export interface IUserCharacterProgressCommandRepo {
    findOrCreate(userId: string): Promise<UserCharacterProgressRow>;
    update(
        userId: string,
        data: Pick<UserCharacterProgressRow, "level" | "xp" | "stage" | "totalCompletions">,
    ): Promise<UserCharacterProgressRow>;
    updateHeroStyle(userId: string, heroStyle: HeroStyle): Promise<UserCharacterProgressRow>;
}
