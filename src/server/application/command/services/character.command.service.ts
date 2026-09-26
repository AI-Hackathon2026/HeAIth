import { HeroStyle, PlanType } from "@/server/shared/types/enums";
import {
    IUserCharacterProgressCommandRepo,
    IUserCharacterProgressQueryRepo,
} from "../../port/repo/I.user.character.progress.repo";
import {
    IPlanProgressEventCommandRepo,
    IPlanProgressEventQueryRepo,
} from "../../port/repo/I.plan.progress.event.repo";
import { CharacterMapper } from "../../query/mapper/character.mapper";
import { CharacterProgressView } from "../../query/view/character.view";
import { applyXp, XP_PER_COMPLETION } from "../../../shared/utils/character-progress.util";

export type PlanProgressRewardResult = {
    leveledUp: boolean;
    previousLevel: number;
    characterProgress: CharacterProgressView;
};

export class CharacterCommandService {
    constructor(
        private characterCommandRepo: IUserCharacterProgressCommandRepo,
        private characterQueryRepo: IUserCharacterProgressQueryRepo,
        private planProgressEventQueryRepo: IPlanProgressEventQueryRepo,
        private planProgressEventCommandRepo: IPlanProgressEventCommandRepo,
    ) {}

    async onPlanProgressUpdated(
        userId: string,
        routineId: string,
        planId: string,
        planType: PlanType,
        newProgress: number,
    ): Promise<PlanProgressRewardResult> {
        const current =
            (await this.characterQueryRepo.findByUserId(userId)) ??
            (await this.characterCommandRepo.findOrCreate(userId));
        const previousLevel = current.level;

        if (newProgress < 100) {
            return {
                leveledUp: false,
                previousLevel,
                characterProgress: CharacterMapper.toProgressView(current),
            };
        }

        const alreadyGranted = await this.planProgressEventQueryRepo.exists(userId, planId, 100);
        if (alreadyGranted) {
            return {
                leveledUp: false,
                previousLevel,
                characterProgress: CharacterMapper.toProgressView(current),
            };
        }

        await this.planProgressEventCommandRepo.create({
            userId,
            routineId,
            planType,
            planId,
            progressPercentage: 100,
            xpGranted: XP_PER_COMPLETION,
        });

        const next = applyXp(current, XP_PER_COMPLETION);
        const updated = await this.characterCommandRepo.update(userId, next);

        return {
            leveledUp: updated.level > previousLevel,
            previousLevel,
            characterProgress: CharacterMapper.toProgressView(updated),
        };
    }

    async updateHeroStyle(userId: string, heroStyle: HeroStyle): Promise<CharacterProgressView> {
        const updated = await this.characterCommandRepo.updateHeroStyle(userId, heroStyle);
        return CharacterMapper.toProgressView(updated);
    }
}
