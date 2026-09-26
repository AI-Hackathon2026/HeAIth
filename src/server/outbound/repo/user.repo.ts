import {
    NewUserEntity,
    PersistUserEntity,
    UserEntity,
} from "../../application/command/entity/user.entity";
import { IUserCommandRepo } from "../../application/port/repo/command/I.user.command.repo";
import { IUserQueryRepo } from "../../application/port/repo/query/I.user.query.repo";
import { UserView } from "../../application/query/view/user.view";
import {
    TechnicalException,
    TechnicalExceptionType,
} from "../../shared/exceptions/technical.exception";
import { UserRow } from "../store/db.schema";
import { deleteUserCascade, JsonStore, newId, nowIso } from "../store/json.store";

const toEntity = (row: UserRow): PersistUserEntity =>
    UserEntity.createPersist({
        id: row.id,
        email: row.email,
        username: row.username,
        password: row.password,
        refreshToken: row.refreshToken ?? undefined,
        role: row.role,
    });

const toView = (row: UserRow): UserView => ({
    id: row.id,
    email: row.email,
    username: row.username,
    role: row.role,
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
});

const notFound = () => new TechnicalException({ type: TechnicalExceptionType.RESOURCE_NOT_FOUND });

export class UserCommandRepo implements IUserCommandRepo {
    constructor(private readonly store: JsonStore) {}

    async create(user: NewUserEntity): Promise<PersistUserEntity> {
        const row = this.store.write((db) => {
            if (db.users.some((u) => u.email === user.email)) {
                throw new TechnicalException({ type: TechnicalExceptionType.UNIQUE_VIOLATION });
            }
            const now = nowIso();
            const created: UserRow = {
                id: newId(),
                username: user.username,
                email: user.email,
                password: user.password,
                role: user.role,
                refreshToken: user.refreshToken ?? null,
                createdAt: now,
                updatedAt: now,
            };
            db.users.push(created);
            return created;
        });
        return toEntity(row);
    }

    async findByEmail(email: string): Promise<PersistUserEntity | null> {
        const row = this.store.read((db) => db.users.find((u) => u.email === email) ?? null);
        return row ? toEntity(row) : null;
    }

    async findById(id: string): Promise<PersistUserEntity> {
        const row = this.store.read((db) => db.users.find((u) => u.id === id) ?? null);
        if (!row) throw notFound();
        return toEntity(row);
    }

    async update(entity: PersistUserEntity): Promise<PersistUserEntity> {
        const row = this.store.write((db) => {
            const found = db.users.find((u) => u.id === entity.id);
            if (!found) throw notFound();
            if (db.users.some((u) => u.id !== entity.id && u.email === entity.email)) {
                throw new TechnicalException({ type: TechnicalExceptionType.UNIQUE_VIOLATION });
            }
            found.email = entity.email;
            found.password = entity.password;
            found.refreshToken = entity.refreshToken ?? null;
            found.updatedAt = nowIso();
            return found;
        });
        return toEntity(row);
    }

    async removeById(id: string): Promise<void> {
        this.store.write((db) => {
            if (!db.users.some((u) => u.id === id)) throw notFound();
            deleteUserCascade(db, id);
        });
    }
}

export class UserQueryRepo implements IUserQueryRepo {
    constructor(private readonly store: JsonStore) {}

    async getUserById(id: string): Promise<UserEntity | null> {
        const row = this.store.read((db) => db.users.find((u) => u.id === id) ?? null);
        return row ? toEntity(row) : null;
    }

    async findAll(): Promise<UserView[]> {
        return this.store.read((db) => db.users).map(toView);
    }

    async findByEmail(email: string): Promise<UserView> {
        const row = this.store.read((db) => db.users.find((u) => u.email === email) ?? null);
        if (!row) throw notFound();
        return toView(row);
    }
}
