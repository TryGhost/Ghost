import type {Knex} from 'knex';
import type {PersistenceAdapter} from '../adapter';

/**
 * Knex-based persistence adapter for direct database access
 */
export class KnexPersistenceAdapter implements PersistenceAdapter {
    constructor(
        private db: Knex
    ) {}
    
    async insert<T>(entityType: string, data: T): Promise<T> {
        // entityType is the table name for Knex
        const [result] = await this.db(entityType).insert(data).returning('*');
        return result as T;
    }
    
    async update<T>(entityType: string, id: string, data: Partial<T>): Promise<T> {
        await this.db(entityType)
            .where('id', id)
            .update(data);
        
        const updated = await this.findById<T>(entityType, id);
        if (!updated) {
            throw new Error(`Entity not found after update: ${entityType}/${id}`);
        }
        
        return updated;
    }
    
    async delete(entityType: string, id: string): Promise<void> {
        await this.db(entityType)
            .where('id', id)
            .del();
    }
    
    async deleteMany(entityType: string, ids: string[]): Promise<void> {
        if (ids.length === 0) {
            return;
        }
        
        await this.db(entityType)
            .whereIn('id', ids)
            .del();
    }
    
    async findById<T>(entityType: string, id: string): Promise<T | null> {
        const result = await this.db(entityType)
            .where('id', id)
            .first();
        
        return result || null;
    }
    
    async findMany<T>(entityType: string, query?: Record<string, unknown>): Promise<T[]> {
        let queryBuilder = this.db(entityType);
        
        if (query) {
            queryBuilder = queryBuilder.where(query);
        }
        
        return await queryBuilder.select();
    }
}