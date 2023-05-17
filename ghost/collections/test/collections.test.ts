import assert from 'assert';
import ObjectID from 'bson-objectid';
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

        const savedCollection = await collectionsService.save({
            title: 'testing collections',
            description: 'testing collections description',
            type: 'manual',
            filter: null,
            feature_image: null,
            deleted: false
        });

        const createdCollection = await collectionsService.getById(savedCollection.id);

        assert.ok(createdCollection, 'Collection should be saved');
        assert.ok(savedCollection.id, 'Collection should have an id');
        assert.equal(createdCollection.title, 'testing collections', 'Collection title should match');

        const allCollections = await collectionsService.getAll();
        assert.equal(allCollections.length, 1, 'There should be one collection');

        await collectionsService.destroy(savedCollection.id);
        const deletedCollection = await collectionsService.getById(savedCollection.id);

        assert.equal(deletedCollection, null, 'Collection should be deleted');
    });

    it('Can create a collection with predefined ID', async function () {
        const repository = new CollectionsRepositoryInMemory();
        const collectionsService = new CollectionsService({repository});

        const id = new ObjectID();
        const savedCollection = await collectionsService.save({
            id: id.toHexString()
        });

        assert.equal(savedCollection.id, id.toHexString(), 'Collection should have same id');
    });

    it('Can create a collection with predefined ObjectID instance', async function () {
        const repository = new CollectionsRepositoryInMemory();
        const collectionsService = new CollectionsService({repository});

        const id = new ObjectID();
        const savedCollection = await collectionsService.save({
            id: id
        });

        assert.equal(savedCollection.id, id.toHexString(), 'Collection should have same id');
    });

    it('Throws an error when trying to save a collection with an invalid ID', async function () {
        const repository = new CollectionsRepositoryInMemory();
        const collectionsService = new CollectionsService({repository});

        try {
            await collectionsService.save({
                id: 12345
            });
        } catch (error: any) {
            assert.equal(error.message, 'Invalid ID provided for Collection', 'Error message should match');
        }
    });
});
