import {Knex} from 'knex';

type Entity<T> = {
    id: T;
    deleted: boolean;
}

type Order<T> = {
    field: keyof T;
    direction: 'asc' | 'desc';
}

export type ModelClass<T> = {
    destroy: (data: {id: T}) => Promise<void>;
    findOne: (data: {id: T}, options?: {require?: boolean}) => Promise<ModelInstance<T> | null>;
    add: (data: object) => Promise<ModelInstance<T>>;
    getFilteredCollection: (options: {filter?: string}) => {
        count(): Promise<number>,
        query: (f: (q: Knex.QueryBuilder) => void) => void,
        fetchAll: () => Promise<ModelInstance<T>[]>
    };
}

export type ModelInstance<T> = {
    id: T;
    get(field: string): unknown;
    set(data: object|string, value?: unknown): void;
    save(properties: object, options?: {autoRefresh?: boolean; method?: 'update' | 'insert'}): Promise<ModelInstance<T>>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type OrderOption<T extends Entity<any> = any> = Order<T>[];

export abstract class BookshelfRepository<IDType, T extends Entity<IDType>> {
    protected Model: ModelClass<IDType>;

    constructor(Model: ModelClass<IDType>) {
        this.Model = Model;
    }

    protected abstract toPrimitive(entity: T): object;
    protected abstract entityFieldToColumn(field: keyof T): string;
    protected abstract modelToEntity(model: ModelInstance<IDType>): Promise<T|null> | T | null;

    #orderToString(order?: OrderOption<T>) {
        if (!order || order.length === 0) {
            return;
        }
        return order.map(({field, direction}) => `${this.entityFieldToColumn(field)} ${direction}`).join(',');
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
        const model = await this.Model.findOne({id}, {require: false}) as ModelInstance<IDType> | null;
        return model ? this.modelToEntity(model) : null;
    }

    async #fetchAll({filter, order, page, limit}: { filter?: string; order?: OrderOption<T>; page?: number; limit?: number }): Promise<T[]> {
        const collection = this.Model.getFilteredCollection({filter});
        const orderString = this.#orderToString(order);

        if ((limit && page) || orderString) {
            collection
                .query((q) => {
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
        }

        const models = await collection.fetchAll();
        return (await Promise.all(models.map(model => this.modelToEntity(model)))).filter(entity => !!entity) as T[];
    }

    async getAll({filter, order}: { filter?: string; order?: OrderOption<T> } = {}): Promise<T[]> {
        return this.#fetchAll({
            filter,
            order
        });
    }

    async getPage({filter, order, page, limit}: { filter?: string; order?: OrderOption<T>; page: number; limit: number }): Promise<T[]> {
        return this.#fetchAll({
            filter,
            order,
            page,
            limit
        });
    }

    async getCount({filter}: { filter?: string } = {}): Promise<number> {
        const collection = this.Model.getFilteredCollection({filter});
        return await collection.count();
    }
}
