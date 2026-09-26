
export interface IChatbot {
    isConfigured(): boolean;
    sendText(message: string): Promise<string | undefined>;
    embedText(message: string): Promise<any>;
    getAvailableModels(): Promise<string[]>;
    changeModel(model: string): Promise<void>;
    getModelName(): Promise<string>;
    createFileSearchStore(displayName: string): Promise<string>;
    uploadPdfToStore(buffer: Buffer, filename: string, storeName: string): Promise<void>;
    sendTextWithFileSearch(message: string, storeNames: string[]): Promise<string>;
    sendTextWithDocumentContext(
        message: string,
        snippets: Array<{ filename: string; page: number; content: string }>,
    ): Promise<string>;
    generateRoutineStructured(
        prompt: string,
        snippets?: Array<{ filename: string; page: number; content: string }>,
    ): Promise<string>;
    adjustRoutineStructured(
        prompt: string,
        snippets?: Array<{ filename: string; page: number; content: string }>,
    ): Promise<string>;
    listStoreDocuments(storeName: string): Promise<Array<{ name: string; displayName: string }>>;
    deleteStoreDocument(documentName: string): Promise<void>;
    listFileSearchStores(): Promise<Array<{ name: string; displayName: string }>>;
    deleteFileSearchStore(storeName: string): Promise<void>;
}
