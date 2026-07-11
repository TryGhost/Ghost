import nql from '@tryghost/nql';

type Entity<T> = {
    id: T;
    deleted: boolean;
}

type Order<T> = {
    field: keyof T;
    direction: 'asc' | 'desc';
}

type OrderOption<T extends Entity<any>> = Order<T>[];

export abstract class InMemoryRepository<IDType, T extends Entity<IDType>> {
    protected store: T[] = [];
    private ids: Map<IDType, true> = new Map();

    protected abstract toPrimitive(entity: T): object;

    public async save(entity: T): Promise<void> {
        if (entity.deleted) {
            this.store = this.store.filter(item => item.id !== entity.id);
            this.ids.delete(entity.id);
            return;
        }

        if (this.ids.has(entity.id)) {
            this.store = this.store.map((item) => {
                if (item.id === entity.id) {
                    return entity;
                }
                return item;
            });
        } else {
            this.store.push(entity);
            this.ids.set(entity.id, true);
        }
    }

    public async getById(id: string): Promise<T | null> {
        return this.store.find(item => item.id === id) || null;
    }

    public async getAll(options: { filter?: string; order?: OrderOption<T> } = {}): Promise<T[]> {
        const filter = nql(options.filter);

        const results = this.store.slice().filter(item => filter.queryJSON(this.toPrimitive(item)));

        if (options.order) {
            for (const order of options.order) {
                results.sort((a, b) => {
                    if (order.direction === 'asc') {
                        return a[order.field] as any > (b[order.field] as any) ? 1 : -1;
                    } else {
                        return a[order.field] < b[order.field] ? 1 : -1;
                    }
                });
            }
        }

        return results;
    }

    public async getPage(options: { filter?: string; page: number; limit: number; order?: Order<T>[] } = {page: 1, limit: 15}): Promise<T[]> {
        const results = await this.getAll(options);

        const start = (options.page - 1) * options.limit;
        const end = start + options.limit;

        return results.slice(start, end);
    }

    public async getCount(options: { filter?: string }): Promise<number> {
        const results = await this.getAll(options);
        return results.length;
    }
}
