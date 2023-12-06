import ObjectID from 'bson-objectid';
import {Entity} from '../base/entity.base';

export type Page = {
    page: number;
    count: number;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export type FilterOf<T = unknown> = {
    string: string;
}

export type OrderOf<Fields extends string[]> = {
    field: Fields[number],
    direction: 'asc' | 'desc';
}

type EntityDataType<T> = T extends Entity<infer U> ? U : never;
export interface Repository<
    T extends Entity<unknown>,
    Filter = FilterOf<EntityDataType<T>>,
    Orderable extends string[] = ['created_at', 'updated_at']
> {
    save(entity: T): Promise<void>

    getOne(id: ObjectID): Promise<T | null>

    getSome(page: Page, order: OrderOf<Orderable>[], filter?: Filter): Promise<T[]>

    getAll(order: OrderOf<Orderable>[], filter?: Filter): Promise<T[]>

    getCount(filter?: Filter): Promise<number>
}
