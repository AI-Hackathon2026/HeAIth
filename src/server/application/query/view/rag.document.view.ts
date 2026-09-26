export type RagStoreView = {
    storeName: string;
    displayName: string;
    createdAt: Date;
};

export type RagDocumentView = {
    name: string;
    displayName: string;
};

export type RagStoreDeleteView = {
    deletedStores: string[];
};
