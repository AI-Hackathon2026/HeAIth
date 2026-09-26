import { PersistRoutineEntity, RoutineEntity } from "../../../command/entity/routine.entity";

export interface IRoutineCommandRepo {
    create(entity: RoutineEntity): Promise<PersistRoutineEntity>;
    update(
        id: string,
        data: {
            difficulty?: RoutineEntity["difficulty"];
            summary?: string;
            reportReadme?: string;
            report?: string;
            isActive?: boolean;
        },
    ): Promise<PersistRoutineEntity>;
    deactivate(id: string): Promise<void>;
    deleteByUserId(userId: string): Promise<void>;
}
