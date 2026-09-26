export type RagStoreRecord = {
    storeName: string;
    displayName: string;
    createdAt: Date;
};

export interface IRagStoreQueryRepo {
    findGlobalStore(): Promise<string | null>;
    findGlobalStoreRecord(): Promise<RagStoreRecord | null>;
}
