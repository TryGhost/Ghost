import assert from 'assert';
import {BookshelfRepository, ModelClass, ModelInstance} from '../src/index';

type SimpleEntity = {
    id: string;
    deleted: boolean;
    name: string;
    age: number;
    birthday: string;
}

class SimpleBookshelfRepository extends BookshelfRepository<string, SimpleEntity> {
    protected modelToEntity(model: ModelInstance<string>): SimpleEntity {
        return {
            id: model.id,
            deleted: false,
            name: model.get('name') as string,
            age: model.get('age') as number,
            birthday: model.get('birthday') as string
        };
    }

    protected toPrimitive(entity: SimpleEntity): object {
        return {
            id: entity.id,
            name: entity.name,
            age: entity.age,
            birthday: entity.birthday
        };
    }

    protected entityFieldToColumn(field: keyof SimpleEntity): string {
        return field as string;
    }
}

class Model implements ModelClass<string> {
    items: ModelInstance<string>[] = [];

    constructor() {
        this.items = [];
    }

    destroy(data: {id: string;}): Promise<void> {
        this.items = this.items.filter(item => item.id !== data.id);
        return Promise.resolve();
    }

    findOne(data: {id: string;}, options?: {require?: boolean | undefined;} | undefined): Promise<ModelInstance<string> | null> {
        const item = this.items.find(i => i.id === data.id);
        if (!item && options?.require) {
            throw new Error('Not found');
        }
        return Promise.resolve(item ?? null);
    }
    findAll(options: {filter?: string | undefined; order?: string | undefined; page?: number; limit?: number | 'all'}): Promise<ModelInstance<string>[]> {
        const sorted = this.items.slice().sort((a, b) => {
            for (const order of options.order?.split(',') ?? []) {
                const [field, direction] = order.split(' ');

                const aValue = a.get(field as string) as number;
                const bValue = b.get(field as string) as number;
                if (aValue < bValue) {
                    return direction === 'asc' ? -1 : 1;
                } else if (aValue > bValue) {
                    return direction === 'asc' ? 1 : -1;
                }
            }
            return 0;
        });
        return Promise.resolve(sorted);
    }

    add(data: object): Promise<ModelInstance<string>> {
        const item = {
            id: (data as any).id,
            get(field: string): unknown {
                return (data as any)[field];
            },
            set(d: object|string, value?: unknown): void {
                if (typeof d === 'string') {
                    (data as any)[d] = value;
                } else {
                    Object.assign(data, d);
                }
            },
            save(properties: object): Promise<ModelInstance<string>> {
                Object.assign(data, properties);
                return Promise.resolve(item);
            }
        };
        this.items.push(item);
        return Promise.resolve(item);
    }

    getFilteredCollection() {
        return this;
    }

    count() {
        return Promise.resolve(this.items.length);
    }
}

describe('BookshelfRepository', function () {
    it('Can save, retrieve, update and delete entities', async function () {
        const repository = new SimpleBookshelfRepository(new Model());

        checkRetrieving: {
            const entity = {
                id: '1',
                deleted: false,
                name: 'John',
                age: 30,
                birthday: new Date('2000-01-01').toISOString()
            };

            await repository.save(entity);
            const result = await repository.getById('1');

            assert(result);
            assert(result.name === 'John');
            assert(result.age === 30);
            assert(result.id === '1');

            break checkRetrieving;
        }

        checkUpdating: {
            const entity = {
                id: '2',
                deleted: false,
                name: 'John',
                age: 24,
                birthday: new Date('2000-01-01').toISOString()
            };

            await repository.save(entity);

            entity.name = 'Kym';

            await repository.save(entity);

            const result = await repository.getById('2');

            assert(result);
            assert.equal(result.name, 'Kym');
            assert.equal(result.age, 24);
            assert.equal(result.id, '2');

            break checkUpdating;
        }

        checkDeleting: {
            const entity = {
                id: '3',
                deleted: false,
                name: 'Egg',
                age: 180,
                birthday: new Date('2010-01-01').toISOString()
            };

            await repository.save(entity);

            assert(await repository.getById('3'));

            entity.deleted = true;

            await repository.save(entity);

            assert(!await repository.getById('3'));

            break checkDeleting;
        }
    });

    it('Can save and retrieve all entities', async function () {
        const repository = new SimpleBookshelfRepository(new Model());
        const entities = [{
            id: '1',
            deleted: false,
            name: 'Kym',
            age: 24,
            birthday: new Date('2000-01-01').toISOString()
        }, {
            id: '2',
            deleted: false,
            name: 'John',
            age: 30,
            birthday: new Date('2000-01-01').toISOString()
        }, {
            id: '3',
            deleted: false,
            name: 'Kevin',
            age: 5,
            birthday: new Date('2000-01-01').toISOString()
        }];

        for (const entity of entities) {
            await repository.save(entity);
        }

        const result = await repository.getAll({
            order: [{
                field: 'age',
                direction: 'desc'
            }]
        });

        assert(result);
        assert(result.length === 3);
        assert(result[0].age === 30);
        assert(result[1].age === 24);
        assert(result[2].age === 5);
    });

    it('Can retrieve page', async function () {
        const repository = new SimpleBookshelfRepository(new Model());
        const entities = [{
            id: '1',
            deleted: false,
            name: 'Kym',
            age: 24,
            birthday: new Date('2000-01-01').toISOString()
        }, {
            id: '2',
            deleted: false,
            name: 'John',
            age: 30,
            birthday: new Date('2000-01-01').toISOString()
        }, {
            id: '3',
            deleted: false,
            name: 'Kevin',
            age: 5,
            birthday: new Date('2000-01-01').toISOString()
        }];

        for (const entity of entities) {
            await repository.save(entity);
        }

        const result = await repository.getPage({
            order: [{
                field: 'age',
                direction: 'desc'
            }],
            limit: 5,
            page: 1
        });

        assert(result);
        assert(result.length === 3);
        assert(result[0].age === 30);
        assert(result[1].age === 24);
        assert(result[2].age === 5);
    });

    it('Can retrieve page without order', async function () {
        const repository = new SimpleBookshelfRepository(new Model());
        const entities = [{
            id: '1',
            deleted: false,
            name: 'Kym',
            age: 24,
            birthday: new Date('2000-01-01').toISOString()
        }, {
            id: '2',
            deleted: false,
            name: 'John',
            age: 30,
            birthday: new Date('2000-01-01').toISOString()
        }, {
            id: '3',
            deleted: false,
            name: 'Kevin',
            age: 5,
            birthday: new Date('2000-01-01').toISOString()
        }];

        for (const entity of entities) {
            await repository.save(entity);
        }

        const result = await repository.getPage({
            order: [],
            limit: 5,
            page: 1
        });

        assert(result);
        assert(result.length === 3);
    });

    it('Can retrieve count', async function () {
        const repository = new SimpleBookshelfRepository(new Model());
        const entities = [{
            id: '1',
            deleted: false,
            name: 'Kym',
            age: 24,
            birthday: new Date('2000-01-01').toISOString()
        }, {
            id: '2',
            deleted: false,
            name: 'John',
            age: 30,
            birthday: new Date('2000-01-01').toISOString()
        }, {
            id: '3',
            deleted: false,
            name: 'Kevin',
            age: 5,
            birthday: new Date('2000-01-01').toISOString()
        }];

        for (const entity of entities) {
            await repository.save(entity);
        }

        const result = await repository.getCount({});
        assert(result === 3);
    });
});
