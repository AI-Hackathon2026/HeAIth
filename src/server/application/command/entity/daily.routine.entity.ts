import { DayOfWeekType } from "@/server/shared/types/enums";

export type PersistDailyRoutineEntity = DailyRoutineEntity & {
    id: string;
}

export class DailyRoutineEntity {
    id?: string;
    routineId: string;
    dayOfWeek: DayOfWeekType;


    constructor(data: {
        id?: string;
        routineId: string;
        dayOfWeek: DayOfWeekType;
    }) {
        this.id = data.id;
        this.routineId = data.routineId;
        this.dayOfWeek = data.dayOfWeek;
    }

    static create(data: {
        routineId: string;
        dayOfWeek: DayOfWeekType;
    }): DailyRoutineEntity {
        return new DailyRoutineEntity({
            ...data,
        });
    }

    static persist(data: {
        id: string;
        routineId: string;
        dayOfWeek: DayOfWeekType;
    }): DailyRoutineEntity {
        return new DailyRoutineEntity(data);
    }
}