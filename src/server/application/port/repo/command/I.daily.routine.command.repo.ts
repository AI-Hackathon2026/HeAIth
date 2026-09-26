import { DailyRoutineEntity, PersistDailyRoutineEntity } from "../../../command/entity/daily.routine.entity";

export interface IDailyRoutineCommandRepo {
    createMany(data: DailyRoutineEntity[]): Promise<PersistDailyRoutineEntity[]>;
}
