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
    findAll: (options: {filter?: string; order?: OrderOption}) => Promise<ModelInstance<T>[]>;
    add: (data: object) => Promise<ModelInstance<T>>;
}

export type ModelInstance<T> = {
    id: T;
    get(field: string): unknown;
    set(data: object|string, value?: unknown): void;
    save(properties: object, options?: {autoRefresh?: boolean; method?: 'update' | 'insert'}): Promise<ModelInstance<T>>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type OrderOption<T extends Entity<any> = any> = Order<T>[];

export abstract class BookshelfRepository<IDType, T extends Entity<IDType>> {
    protected Model: ModelClass<IDType>;

    constructor(Model: ModelClass<IDType>) {
        this.Model = Model;
    }

    protected abstract toPrimitive(entity: T): object;
    protected abstract modelToEntity(model: ModelInstance<IDType>): Promise<T|null> | T | null;

    async save(entity: T): Promise<void> {
        if (entity.deleted) {
            await this.Model.destroy({id: entity.id});
            return;
        }

        const existing = await this.Model.findOne({id: entity.id}, {require: false});
        if (existing) {
            existing.set(this.toPrimitive(entity))
            await existing.save({}, {autoRefresh: false, method: 'update'});
        } else {
            await this.Model.add(this.toPrimitive(entity))
        }
    }

    async getById(id: IDType): Promise<T | null> {
        const model = await this.Model.findOne({id}, {require: false}) as ModelInstance<IDType> | null;
        return model ? this.modelToEntity(model) : null;
    }

    async getAll({filter, order}: { filter?: string; order?: OrderOption<T> } = {}): Promise<T[]> {
        const models = await this.Model.findAll({filter, order}) as ModelInstance<IDType>[];
        return (await Promise.all(models.map(model => this.modelToEntity(model)))).filter(entity => !!entity) as T[];
    }
}
