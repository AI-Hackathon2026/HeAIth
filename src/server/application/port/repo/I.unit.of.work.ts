export type TransactionOptions =
    | {
        useTransaction: false;
    }
    | {
        useTransaction: true;
        isolationLevel: "ReadCommitted" | "RepeatableRead" | "Serializable";
    };

export type UnitOfWorkOptions = {
    transactionOptions: TransactionOptions;
    useOptimisticLock: boolean;
};

export interface IUnitOfWork {
    do<T>(work: () => Promise<T>, options?: UnitOfWorkOptions): Promise<T>;
}
