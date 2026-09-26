import { IRoutineQueryRepo } from "../../port/repo/query/I.routine.query.repo";
import { BusinessException, BusinessExceptionType } from "../../../shared/exceptions/business.exception";
import { RoutineMeView } from "../view/routine.view";
import { CharacterQueryService } from "./character.query.service";

export class RoutineQueryService {
    constructor(
        private routineQueryRepo: IRoutineQueryRepo,
        private characterQueryService: CharacterQueryService,
    ) {}

    async getActiveRoutine(userId: string): Promise<RoutineMeView> {
        const routine = await this.routineQueryRepo.findActiveByUserId(userId);
        if (!routine) {
            throw new BusinessException({ type: BusinessExceptionType.ROUTINE_NOT_FOUND });
        }

        const characterProgress = await this.characterQueryService.getCharacterProgress(userId);

        return {
            ...routine,
            characterProgress,
        };
    }

    async getLogs(routineId: string, userId: string) {
        await this._assertRoutineOwner(routineId, userId);
        return [];
    }

    async getTasks(routineId: string, userId: string, _date?: string) {
        await this._assertRoutineOwner(routineId, userId);
        return [];
    }

    async getProgress(routineId: string, userId: string, _date?: string) {
        await this._assertRoutineOwner(routineId, userId);
        return {
            todayCompleted: 0,
            todayTotal: 0,
            todayPercent: 0,
            weekCompleted: 0,
            weekTarget: 0,
            streakDays: 0,
            completionHistory: [],
        };
    }

    private async _assertRoutineOwner(routineId: string, userId: string) {
        const routine = await this.routineQueryRepo.findById(routineId);
        if (!routine || routine.userId !== userId) {
            throw new BusinessException({ type: BusinessExceptionType.ROUTINE_NOT_FOUND });
        }
    }
}
