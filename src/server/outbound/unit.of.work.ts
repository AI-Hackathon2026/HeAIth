import { IUnitOfWork, UnitOfWorkOptions } from "../application/port/repo/I.unit.of.work";

/**
 * With a single JSON file there are no database transactions: every repository
 * write is applied and flushed atomically on its own. The unit of work is kept
 * so the application services stay unchanged; it simply runs the work.
 */
export class UnitOfWork implements IUnitOfWork {
    async do<T>(work: () => Promise<T>, _options?: UnitOfWorkOptions): Promise<T> {
        return work();
    }
}
