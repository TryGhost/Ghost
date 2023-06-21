import assert from 'assert';
import {InMemoryRepository} from '../src/index';

type SimpleEntity = {
    id: string;
    deleted: boolean;
    name: string;
    age: number;
}

class SimpleInMemoryRepository extends InMemoryRepository<string, SimpleEntity> {
    constructor() {
        super();
    }
    protected toPrimitive(entity: SimpleEntity): object {
        return {
            name: entity.name,
            age: entity.age
        };
    }
}

describe('InMemoryRepository', function () {
    it('Can save, retrieve, update and delete entities', async function () {
        const repository = new SimpleInMemoryRepository();

        checkRetrieving: {
            const entity = {
                id: '1',
                deleted: false,
                name: 'John',
                age: 30
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
                age: 24
            };

            await repository.save(entity);

            entity.name = 'Kym';

            await repository.save(entity);

            const result = await repository.getById('2');

            assert(result);
            assert(result.name === 'Kym');
            assert(result.age === 24);
            assert(result.id === '2');

            break checkUpdating;
        }

        checkDeleting: {
            const entity = {
                id: '3',
                deleted: false,
                name: 'Egg',
                age: 180
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
        const repository = new SimpleInMemoryRepository();
        const entities = [{
            id: '1',
            deleted: false,
            name: 'Kym',
            age: 24
        }, {
            id: '2',
            deleted: false,
            name: 'John',
            age: 30
        }, {
            id: '3',
            deleted: false,
            name: 'Kevin',
            age: 5
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

    it('Can save and retrieve a page of entities', async function () {
        const repository = new SimpleInMemoryRepository();
        const entities = [{
            id: '1',
            deleted: false,
            name: 'John',
            age: 30
        }, {
            id: '2',
            deleted: false,
            name: 'Kym',
            age: 24
        }, {
            id: '3',
            deleted: false,
            name: 'Egg',
            age: 180
        }, {
            id: '4',
            deleted: false,
            name: 'Kevin',
            age: 36
        }];

        for (const entity of entities) {
            await repository.save(entity);
        }

        const result = await repository.getPage({
            filter: 'age:>25',
            page: 1,
            limit: 3,
            order: [{
                field: 'age',
                direction: 'asc'
            }]
        });

        const count = await repository.getCount({
            filter: 'name:John'
        });

        assert(result);
        assert(result.length === 3);
        assert(count === 1);
    });
});
