/* eslint-disable ghost/filenames/match-exported-class */

import {Knex} from 'knex';
import {mapKeys, chainTransformers} from '@tryghost/mongo-utils';
import errors from '@tryghost/errors';

type Entity<T> = {
    id: T;
    deleted: boolean
}

type Order<T> = {
    field: keyof T;
    direction: 'asc' | 'desc';
}

export type ModelClass<T> = {
    destroy: (data: {id: T}) => Promise<void>;
    findOne: (data: {id: T}, options?: {require?: boolean}) => Promise<ModelInstance<T> | null>;
    add: (data: object) => Promise<ModelInstance<T>>;
    getFilteredCollection: (options: {filter?: string, mongoTransformer?: unknown}) => {
        count(): Promise<number>,
        query: (f?: (q: Knex.QueryBuilder) => void) => Knex.QueryBuilder,
        fetchAll: () => Promise<ModelInstance<T>[]>
    };
}

export type ModelInstance<T> = {
    id: T;
    get(field: string): unknown;
    set(data: object|string, value?: unknown): void;
    save(properties: object, options?: {autoRefresh?: boolean; method?: 'update' | 'insert'}): Promise<ModelInstance<T>>;
}

type OptionalPropertyOf<T extends object> = Exclude<{
[K in keyof T]: T extends Record<K, Exclude<T[K], undefined>>
    ? never
    : K
}[keyof T], undefined>

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type OrderOption<T extends Entity<any> = any> = Order<T>[];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type IncludeOption<T extends Entity<any> = any> = OptionalPropertyOf<T>[];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AllOptions<T extends Entity<any> = any> = { filter?: string; order?: OrderOption<T>; page?: number; limit?: number, include?: IncludeOption<T> }

export abstract class BookshelfRepository<IDType, T extends Entity<IDType>> {
    protected Model: ModelClass<IDType>;

    constructor(Model: ModelClass<IDType>) {
        this.Model = Model;
    }

    protected abstract toPrimitive(entity: T): object;
    protected abstract modelToEntity (model: ModelInstance<IDType>): Promise<T|null> | T | null
    protected abstract getFieldToColumnMap(): Record<keyof T, string>;

    /**
     * override this method to add custom query logic to knex queries
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    applyCustomQuery(query: Knex.QueryBuilder, options: AllOptions<T>) {
        return;
    }

    #entityFieldToColumn(field: keyof T): string {
        const mapping = this.getFieldToColumnMap();
        return mapping[field];
    }

    #orderToString(order?: OrderOption<T>) {
        if (!order || order.length === 0) {
            return;
        }
        return order.map(({field, direction}) => `${this.#entityFieldToColumn(field)} ${direction}`).join(',');
    }

    /**
     * Map all the fields in an NQL filter to the names of the model
     */
    #getNQLKeyTransformer() {
        return chainTransformers(...mapKeys(this.getFieldToColumnMap()));
    }

    async save(entity: T): Promise<void> {
        if (entity.deleted) {
            await this.Model.destroy({id: entity.id});
            return;
        }

        const existing = await this.Model.findOne({id: entity.id}, {require: false});
        if (existing) {
            existing.set(this.toPrimitive(entity));
            await existing.save({}, {autoRefresh: false, method: 'update'});
        } else {
            await this.Model.add(this.toPrimitive(entity));
        }
    }

    async getById(id: IDType): Promise<T | null> {
        const models = await this.#fetchAll({
            filter: `id:'${id}'`,
            limit: 1
        });
        if (models.length === 1) {
            return models[0];
        }
        return null;
    }

    async #fetchAll(options: AllOptions<T> = {}): Promise<T[]> {
        const {filter, order, page, limit} = options;
        if (page !== undefined) {
            if (page < 1) {
                throw new errors.BadRequestError({message: 'page must be greater or equal to 1'});
            }
            if (limit !== undefined && limit < 1) {
                throw new errors.BadRequestError({message: 'limit must be greater or equal to 1'});
            }
        }

        const collection = this.Model.getFilteredCollection({
            filter,
            mongoTransformer: this.#getNQLKeyTransformer()
        });
        const orderString = this.#orderToString(order);

        collection
            .query((q) => {
                this.applyCustomQuery(q, options);

                if (limit) {
                    q.limit(limit);
                }
                if (limit && page) {
                    q.limit(limit);
                    q.offset(limit * (page - 1));
                }

                if (orderString) {
                    q.orderByRaw(
                        orderString
                    );
                }
            });

        const models = await collection.fetchAll();
        return (await Promise.all(models.map(model => this.modelToEntity(model)))).filter(entity => !!entity) as T[];
    }

    async getAll({filter, order, include}: Omit<AllOptions<T>, 'page'|'limit'> = {}): Promise<T[]> {
        return this.#fetchAll({
            filter,
            order,
            include
        });
    }

    async getPage({filter, order, page, limit, include}: AllOptions<T> & Required<Pick<AllOptions<T>, 'page'|'limit'>>): Promise<T[]> {
        return this.#fetchAll({
            filter,
            order,
            page,
            limit,
            include
        });
    }

    async getCount({filter}: { filter?: string } = {}): Promise<number> {
        const collection = this.Model.getFilteredCollection({
            filter,
            mongoTransformer: this.#getNQLKeyTransformer()
        });
        return await collection.count();
    }

    async getGroupedCount<K extends keyof T>({filter, groupBy}: { filter?: string, groupBy: K }): Promise<({count: number} & Record<K, T[K]>)[]> {
        const columnName = this.#entityFieldToColumn(groupBy);

        const data = (await this.Model.getFilteredCollection({
            filter,
            mongoTransformer: this.#getNQLKeyTransformer()
        }).query()
            .select(columnName)
            .count('* as count')
            .groupBy(columnName)) as ({count: number} & Record<string, T[K]>)[];

        return data.map((row) => {
            return {
                count: row.count,
                [groupBy]: row[columnName]
            };
        }) as ({count: number} & Record<K, T[K]>)[];
    }
}
