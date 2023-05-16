import assert from 'assert';
import {CollectionsService} from '../src/index';
import {CollectionsRepositoryInMemory} from '../src/CollectionsRepositoryInMemory';

describe('collections', function () {
    it('Instantiates a CollectionsService', function () {
        const repository = new CollectionsRepositoryInMemory();
        const collectionsService = new CollectionsService({repository});
        assert.ok(collectionsService, 'CollectionsService should initialize');
    });

    it('Can do CRUD operations on a collection', async function () {
        const repository = new CollectionsRepositoryInMemory();
        const collectionsService = new CollectionsService({repository});

        await collectionsService.save({
            id: 'test_id_1',
            title: 'testing collections',
            description: 'testing collections description',
            type: 'manual',
            filter: null,
            feature_image: null,
            deleted: false
        });

        const createdCollection = await collectionsService.getById('test_id_1');

        assert.ok(createdCollection, 'Collection should be saved');
        assert.equal(createdCollection.title, 'testing collections', 'Collection title should match');

        const allCollections = await collectionsService.getAll();
        assert.equal(allCollections.length, 1, 'There should be one collection');

        await collectionsService.destroy('test_id_1');
        const deletedCollection = await collectionsService.getById('test_id_1');

        assert.equal(deletedCollection, null, 'Collection should be deleted');
    });
});
