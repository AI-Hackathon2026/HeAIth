import { ChatEntity } from "../../application/command/entity/chat.entity";
import { MessageEntity } from "../../application/command/entity/message.entity";
import { IChatCommandRepo } from "../../application/port/repo/command/I.chat.command.repo";
import { IMessageCommandRepo } from "../../application/port/repo/command/I.message.command.repo";
import { ChatDetailView, IChatQueryRepo } from "../../application/port/repo/query/I.chat.query.repo";
import { ChatHistoryView } from "../../application/query/view/chat.history.view";
import { ChatView } from "../../application/query/view/chat.view";
import {
    TechnicalException,
    TechnicalExceptionType,
} from "../../shared/exceptions/technical.exception";
import { ChatRow } from "../store/db.schema";
import { deleteChatCascade, JsonStore, newId, nowIso } from "../store/json.store";

const notFound = () => new TechnicalException({ type: TechnicalExceptionType.RESOURCE_NOT_FOUND });

const toDetail = (chat: ChatRow): ChatDetailView => ({
    id: chat.id,
    userId: chat.userId,
    title: chat.title,
    routineId: chat.routineId,
});

export class ChatCommandRepo implements IChatCommandRepo {
    constructor(private readonly store: JsonStore) {}

    async create(entity: ChatEntity): Promise<ChatEntity> {
        const row = this.store.write((db) => {
            const now = nowIso();
            const chat: ChatRow = {
                id: newId(),
                userId: entity.userId,
                title: entity.title,
                routineId: entity.routineId ?? null,
                createdAt: now,
                updatedAt: now,
            };
            db.chats.push(chat);
            return chat;
        });
        return new ChatEntity(row);
    }

    async update(entity: ChatEntity): Promise<void> {
        this.store.write((db) => {
            const chat = db.chats.find((c) => c.id === entity.id);
            if (!chat) throw notFound();
            chat.title = entity.title;
            chat.userId = entity.userId;
            chat.routineId = entity.routineId ?? chat.routineId;
            chat.updatedAt = nowIso();
        });
    }

    async deleteById(id: string): Promise<void> {
        this.store.write((db) => {
            if (!db.chats.some((c) => c.id === id)) throw notFound();
            deleteChatCascade(db, id);
        });
    }

    async findById(id: string): Promise<ChatEntity> {
        const chat = this.store.read((db) => db.chats.find((c) => c.id === id) ?? null);
        if (!chat) throw notFound();
        return new ChatEntity(chat);
    }
}

export class ChatQueryRepo implements IChatQueryRepo {
    constructor(private readonly store: JsonStore) {}

    async findAll(userId: string): Promise<ChatView[]> {
        return this.store
            .read((db) => db.chats.filter((c) => c.userId === userId))
            .map((chat) => ({
                id: chat.id,
                title: chat.title,
                createdAt: new Date(chat.createdAt),
                updatedAt: new Date(chat.updatedAt),
            }));
    }

    async findMessages(chatId: string): Promise<ChatHistoryView> {
        const found = this.store.read((db) => {
            const chat = db.chats.find((c) => c.id === chatId);
            if (!chat) return null;
            const messages = db.messages
                .filter((m) => m.chatId === chatId)
                .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
            return { chat, messages };
        });
        if (!found) throw notFound();

        return {
            id: found.chat.id,
            title: found.chat.title,
            messages: found.messages.map((message) => ({
                id: message.id,
                from: message.role,
                text: message.text,
                createdAt: new Date(message.createdAt),
                updatedAt: new Date(message.updatedAt),
            })),
        };
    }

    async findById(chatId: string): Promise<ChatDetailView | null> {
        const chat = this.store.read((db) => db.chats.find((c) => c.id === chatId) ?? null);
        return chat ? toDetail(chat) : null;
    }

    async findByUserIdAndRoutineId(userId: string, routineId: string): Promise<ChatDetailView | null> {
        const chat = this.store.read(
            (db) =>
                db.chats
                    .filter((c) => c.userId === userId && c.routineId === routineId)
                    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null,
        );
        return chat ? toDetail(chat) : null;
    }
}

export class MessageCommandRepo implements IMessageCommandRepo {
    constructor(private readonly store: JsonStore) {}

    async create(entity: MessageEntity): Promise<void> {
        this.store.write((db) => {
            if (!db.chats.some((c) => c.id === entity.chatId)) throw notFound();
            const now = nowIso();
            db.messages.push({
                id: newId(),
                chatId: entity.chatId,
                role: entity.role,
                text: entity.text,
                createdAt: now,
                updatedAt: now,
            });
        });
    }

    async findById(id: string): Promise<MessageEntity> {
        const message = this.store.read((db) => db.messages.find((m) => m.id === id) ?? null);
        if (!message) throw notFound();
        return new MessageEntity(message);
    }

    async update(entity: MessageEntity): Promise<void> {
        this.store.write((db) => {
            const message = db.messages.find((m) => m.id === entity.id);
            if (!message) throw notFound();
            message.text = entity.text;
            message.updatedAt = nowIso();
        });
    }

    async deleteById(id: string): Promise<void> {
        this.store.write((db) => {
            if (!db.messages.some((m) => m.id === id)) throw notFound();
            db.messages = db.messages.filter((m) => m.id !== id);
        });
    }
}
