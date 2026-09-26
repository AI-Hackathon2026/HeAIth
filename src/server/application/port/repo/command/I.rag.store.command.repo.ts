export interface IRagStoreCommandRepo {
    save(storeName: string, displayName: string): Promise<void>;
    deleteByStoreName(storeName: string): Promise<void>;
    deleteAll(): Promise<void>;
}
