/**
 * Core persistence adapter interface
 */
export interface PersistenceAdapter {
    insert<T>(entityType: string, data: T): Promise<T>;
    update<T>(entityType: string, id: string, data: Partial<T>): Promise<T>;
    delete(entityType: string, id: string): Promise<void>;
    deleteMany(entityType: string, ids: string[]): Promise<void>;
    findById<T>(entityType: string, id: string): Promise<T | null>;
    findMany<T>(entityType: string, query?: Record<string, unknown>): Promise<T[]>;
}

/**
 * Entity metadata for routing
 */
export interface EntityMetadata {
    tableName?: string; // For database adapters
    endpoint?: string; // For API adapters
    primaryKey?: string; // Default: 'id'
}

/**
 * Registry for entity configurations
 */
export interface EntityRegistry {
    register(entityType: string, metadata: EntityMetadata): void;
    getMetadata(entityType: string): EntityMetadata;
}