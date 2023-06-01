import assert from 'assert';
import {CollectionsService, CollectionsRepositoryInMemory, Collection} from '../src/index';
import {posts} from './fixtures/posts';

describe('CollectionsService', function () {
    let collectionsService: CollectionsService;

    beforeEach(async function () {
        const collectionsRepository = new CollectionsRepositoryInMemory();

        collectionsService = new CollectionsService({
            collectionsRepository
        });
    });

    it('Instantiates a CollectionsService', function () {
        assert.ok(collectionsService, 'CollectionsService should initialize');
    });

    it('Can do CRUD operations on a collection', async function () {
        const savedCollection = await collectionsService.createCollection({
            title: 'testing collections',
            description: 'testing collections description',
            type: 'manual',
            filter: null
        });

        const createdCollection = await collectionsService.getById(savedCollection.id);

        assert.ok(createdCollection, 'Collection should be saved');
        assert.ok(savedCollection.id, 'Collection should have an id');
        assert.equal(createdCollection.title, 'testing collections', 'Collection title should match');

        const allCollections = await collectionsService.getAll();
        assert.equal(allCollections.data.length, 1, 'There should be one collection');

        await collectionsService.destroy(savedCollection.id);
        const deletedCollection = await collectionsService.getById(savedCollection.id);

        assert.equal(deletedCollection, null, 'Collection should be deleted');
    });

    describe('toDTO', function () {
        it('Can map Collection entity to DTO object', async function () {
            const collection = await Collection.create({});
            const dto = collectionsService.toDTO(collection);

            assert.equal(dto.id, collection.id, 'DTO should have the same id as the entity');
            assert.equal(dto.title, null, 'DTO should return null if nullable property of the entity is unassigned');
        });
    });

    describe('addPostToCollection', function () {
        it('Can add a Post to a Collection', async function () {
            const collection = await collectionsService.createCollection({
                title: 'testing collections',
                description: 'testing collections description',
                type: 'manual'
            });

            const editedCollection = await collectionsService.addPostToCollection(collection.id, posts[0]);

            assert.equal(editedCollection?.posts.length, 1, 'Collection should have one post');
            assert.equal(editedCollection?.posts[0].id, posts[0].id, 'Collection should have the correct post');
        });

        it('Does not error when trying to add a post to a collection that does not exist', async function () {
            const editedCollection = await collectionsService.addPostToCollection('fake id', posts[0]);
            assert(editedCollection === null);
        });
    });

    describe('edit', function () {
        it('Can edit existing collection', async function () {
            const savedCollection = await collectionsService.createCollection({
                title: 'testing collections',
                description: 'testing collections description',
                type: 'manual'
            });

            const editedCollection = await collectionsService.edit({
                id: savedCollection.id,
                title: 'Edited title',
                description: 'Edited description',
                feature_image: '/assets/images/edited.jpg'
            });

            assert.equal(editedCollection?.title, 'Edited title', 'Collection title should be edited');
            assert.equal(editedCollection?.description, 'Edited description', 'Collection description should be edited');
            assert.equal(editedCollection?.feature_image, '/assets/images/edited.jpg', 'Collection feature_image should be edited');
            assert.equal(editedCollection?.type, 'manual', 'Collection type should not be edited');
        });

        it('Resolves to null when editing unexistend collection', async function () {
            const editedCollection = await collectionsService.edit({
                id: '12345'
            });

            assert.equal(editedCollection, null, 'Collection should be null');
        });

        it('Adds a Post to a Collection', async function () {
            const collection = await collectionsService.createCollection({
                title: 'testing collections',
                description: 'testing collections description',
                type: 'manual'
            });

            const editedCollection = await collectionsService.edit({
                id: collection.id,
                posts: [{
                    id: posts[0].id
                }]
            });

            assert.equal(editedCollection?.posts.length, 1, 'Collection should have one post');
            assert.equal(editedCollection?.posts[0].id, posts[0].id, 'Collection should have the correct post');
            assert.equal(editedCollection?.posts[0].sort_order, 0, 'Collection should have the correct post sort order');
        });

        it('Removes a Post from a Collection', async function () {
            const collection = await collectionsService.createCollection({
                title: 'testing collections',
                description: 'testing collections description',
                type: 'manual'
            });

            let editedCollection = await collectionsService.edit({
                id: collection.id,
                posts: [{
                    id: posts[0].id
                }, {
                    id: posts[1].id
                }]
            });

            assert.equal(editedCollection?.posts.length, 2, 'Collection should have two posts');

            editedCollection = await collectionsService.removePostFromCollection(collection.id, posts[0].id);

            assert.equal(editedCollection?.posts.length, 1, 'Collection should have one posts');
        });

        it('Returns null when removing post from non existing collection', async function () {
            const collection = await collectionsService.removePostFromCollection('i-do-not-exist', posts[0].id);

            assert.equal(collection, null, 'Collection should be null');
        });
    });
});
