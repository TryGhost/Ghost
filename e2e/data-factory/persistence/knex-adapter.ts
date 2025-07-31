import type {Knex} from 'knex';
import type {PersistenceAdapter, EntityRegistry} from './types';

/**
 * Knex-based persistence adapter for direct database access
 */
export class KnexPersistenceAdapter implements PersistenceAdapter {
    constructor(
        private db: Knex,
        private registry: EntityRegistry
    ) {}
    
    async insert<T>(entityType: string, data: T): Promise<T> {
        const {tableName} = this.registry.getMetadata(entityType);
        if (!tableName) {
            throw new Error(`No table configured for entity type: ${entityType}`);
        }
        
        await this.db(tableName).insert(data);
        return data;
    }
    
    async update<T>(entityType: string, id: string, data: Partial<T>): Promise<T> {
        const {tableName, primaryKey = 'id'} = this.registry.getMetadata(entityType);
        if (!tableName) {
            throw new Error(`No table configured for entity type: ${entityType}`);
        }
        
        await this.db(tableName)
            .where(primaryKey, id)
            .update(data);
        
        const updated = await this.findById<T>(entityType, id);
        if (!updated) {
            throw new Error(`Entity not found after update: ${entityType}/${id}`);
        }
        
        return updated;
    }
    
    async delete(entityType: string, id: string): Promise<void> {
        const {tableName, primaryKey = 'id'} = this.registry.getMetadata(entityType);
        if (!tableName) {
            throw new Error(`No table configured for entity type: ${entityType}`);
        }
        
        await this.db(tableName)
            .where(primaryKey, id)
            .del();
    }
    
    async deleteMany(entityType: string, ids: string[]): Promise<void> {
        if (ids.length === 0) {
            return;
        }
        
        const {tableName, primaryKey = 'id'} = this.registry.getMetadata(entityType);
        if (!tableName) {
            throw new Error(`No table configured for entity type: ${entityType}`);
        }
        
        await this.db(tableName)
            .whereIn(primaryKey, ids)
            .del();
    }
    
    async findById<T>(entityType: string, id: string): Promise<T | null> {
        const {tableName, primaryKey = 'id'} = this.registry.getMetadata(entityType);
        if (!tableName) {
            throw new Error(`No table configured for entity type: ${entityType}`);
        }
        
        const result = await this.db(tableName)
            .where(primaryKey, id)
            .first();
        
        return result || null;
    }
    
    async findMany<T>(entityType: string, query?: Record<string, unknown>): Promise<T[]> {
        const {tableName} = this.registry.getMetadata(entityType);
        if (!tableName) {
            throw new Error(`No table configured for entity type: ${entityType}`);
        }
        
        let queryBuilder = this.db(tableName);
        
        if (query) {
            queryBuilder = queryBuilder.where(query);
        }
        
        return await queryBuilder.select();
    }
}