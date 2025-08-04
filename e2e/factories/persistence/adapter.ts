export interface PersistenceAdapter {
    insert<T>(entityType: string, data: T): Promise<T>;
    findById<T>(entityType: string, id: string): Promise<T | null>;
    findMany<T>(entityType: string, query?: Record<string, unknown>): Promise<T[]>;
    update<T>(entityType: string, id: string, data: Partial<T>): Promise<T>;
    delete(entityType: string, id: string): Promise<void>;
    deleteMany(entityType: string, ids: string[]): Promise<void>;
}
