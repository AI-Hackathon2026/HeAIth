import { RoutineEntity } from "../../../command/entity/routine.entity";
import { RoutineScheduleView } from "../../../query/view/routine.view";

export type ActiveRoutineMeta = {
    id: string;
    schedule: RoutineScheduleView;
};

export interface IRoutineQueryRepo {
    findActiveByUserId(userId: string): Promise<RoutineScheduleView | null>;
    findActiveMetaByUserId(userId: string): Promise<ActiveRoutineMeta | null>;
    findById(id: string): Promise<RoutineEntity | null>;
}
