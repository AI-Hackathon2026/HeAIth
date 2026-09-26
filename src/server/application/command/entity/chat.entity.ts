
export class ChatEntity {
    id?: string;
    userId: string;
    title: string;
    routineId?: string | null;

    constructor({
        id,
        userId,
        title,
        routineId,
    }: {
        id?: string;
        userId: string;
        title: string;
        routineId?: string | null;
    }) {
        this.id = id;
        this.userId = userId;
        this.title = title;
        this.routineId = routineId;
    }

    update({ userId, title }: { userId: string; title: string }) {
        this.title = title;
        this.userId = userId;
    }
}
