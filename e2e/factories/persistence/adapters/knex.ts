import type {Knex} from 'knex';
import type {PersistenceAdapter} from '../adapter';
import type {DatabaseMetadata, EntityRegistry} from '../entity-registry';

export class KnexPersistenceAdapter implements PersistenceAdapter {
    constructor(private db: Knex, private registry: EntityRegistry<DatabaseMetadata>) {}

    async connect(): Promise<void> {
        await this.db.raw('SELECT 1');
    }

    async disconnect(): Promise<void> {
        await this.db.destroy();
    }

    async insert<T>(entityType: string, data: T): Promise<T> {
        const {tableName} = this.registry.getMetadata(entityType);

        await this.db(tableName).insert(data);
        return data;
    }

    async update<T>(entityType: string, id: string, data: Partial<T>): Promise<T> {
        const {tableName, primaryKey = 'id'} = this.registry.getMetadata(entityType);

        await this
            .db(tableName)
            .where(primaryKey, id)
            .update(data);

        return this.verifyUpdate(entityType, id);
    }

    private async verifyUpdate<T>(entityType: string, id: string): Promise<T> {
        const updated = await this.find<T>(entityType, id);

        if (!updated) {
            throw new Error(`Entity not found after update: ${entityType}/${id}`);
        }

        return updated;
    }

    async delete(entityType: string, id: string): Promise<void> {
        const {tableName, primaryKey = 'id'} = this.registry.getMetadata(entityType);

        await this
            .db(tableName)
            .where(primaryKey, id)
            .del();
    }

    async deleteMany(entityType: string, ids: string[]): Promise<void> {
        if (ids.length === 0) {
            return;
        }

        const {tableName, primaryKey = 'id'} = this.registry.getMetadata(entityType);

        await this
            .db(tableName)
            .whereIn(primaryKey, ids)
            .del();
    }

    async find<T>(entityType: string, id: string): Promise<T | null> {
        const {tableName, primaryKey = 'id'} = this.registry.getMetadata(entityType);

        const result = await this
            .db(tableName)
            .where(primaryKey, id)
            .first();

        return result || null;
    }

    async findMany<T>(entityType: string, query?: Record<string, unknown>): Promise<T[]> {
        const {tableName} = this.registry.getMetadata(entityType);

        let queryBuilder = this.db(tableName);

        if (query) {
            queryBuilder = queryBuilder.where(query);
        }

        return await queryBuilder.select();
    }
}
