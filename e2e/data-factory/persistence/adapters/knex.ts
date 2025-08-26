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
        await this.db(entityType).insert(data);
        
        // MySQL doesn't support returning(), so we need to fetch the inserted record
        // Assuming the data has an 'id' field
        const id = (data as {id?: string}).id;
        if (!id) {
            throw new Error('Cannot insert without an id field');
        }
        
        return await this.findById<T>(entityType, id);
    }
    
    async update<T>(entityType: string, id: string, data: Partial<T>): Promise<T> {
        await this.db(entityType)
            .where('id', id)
            .update(data);
        
        return await this.findById<T>(entityType, id);
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
    
    async findById<T>(entityType: string, id: string): Promise<T> {
        const result = await this.db(entityType)
            .where('id', id)
            .first();
        
        if (!result) {
            throw new Error(`${entityType} with id ${id} not found`);
        }
        
        return result;
    }
    
    async findMany<T>(entityType: string, query?: Record<string, unknown>): Promise<T[]> {
        let queryBuilder = this.db(entityType);
        
        if (query) {
            queryBuilder = queryBuilder.where(query);
        }
        
        return await queryBuilder.select();
    }
}