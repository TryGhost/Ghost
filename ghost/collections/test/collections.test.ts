import assert from 'assert';
import {CollectionsService, CollectionsRepositoryInMemory} from '../src/index';
import {PostsRepositoryInMemory} from './fixtures/PostsRepositoryInMemory';
import {posts} from './fixtures/posts';

const initPostsRepository = (): PostsRepositoryInMemory => {
    const postsRepository = new PostsRepositoryInMemory();

    for (const post of posts) {
        const collectionPost = {
            id: post.id,
            title: post.title,
            slug: post.slug,
            featured: post.featured,
            published_at: post.published_at,
            deleted: false
        };
        postsRepository.save(collectionPost);
    }

    return postsRepository;
};

describe('CollectionsService', function () {
    let collectionsService: CollectionsService;

    beforeEach(async function () {
        const collectionsRepository = new CollectionsRepositoryInMemory();
        const postsRepository = initPostsRepository();

        collectionsService = new CollectionsService({
            collectionsRepository,
            postsRepository
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

    it('Throws when built in collection is attempted to be deleted', async function () {
        const collection = await collectionsService.createCollection({
            title: 'Featured Posts',
            slug: 'featured',
            description: 'Collection of featured posts',
            type: 'automatic',
            deletable: false,
            filter: 'featured:true'
        });

        await assert.rejects(async () => {
            await collectionsService.destroy(collection.id);
        }, (err: any) => {
            assert.equal(err.message, 'Cannot delete builtin collection', 'Error message should match');
            assert.equal(err.context, `The collection ${collection.id} is a builtin collection and cannot be deleted`, 'Error context should match');
            return true;
        });
    });

    describe('getCollectionsForPost', function () {
        it('Can get collections for a post', async function () {
            const collection = await collectionsService.createCollection({
                title: 'testing collections',
                type: 'manual'
            });

            await collectionsService.addPostToCollection(collection.id, posts[0]);

            const collections = await collectionsService.getCollectionsForPost(posts[0].id);

            assert.equal(collections.length, 1, 'There should be one collection');
            assert.equal(collections[0].id, collection.id, 'Collection should be the correct one');
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

    describe('Automatic Collections', function () {
        it('Can create an automatic collection', async function () {
            const collection = await collectionsService.createCollection({
                title: 'I am automatic',
                description: 'testing automatic collection',
                type: 'automatic',
                filter: 'featured:true'
            });

            assert.equal(collection.type, 'automatic', 'Collection should be automatic');
            assert.equal(collection.filter, 'featured:true', 'Collection should have the correct filter');

            assert.equal(collection.posts.length, 2, 'Collection should have two posts');
        });

        it('Populates collection when the type is changed to automatic and filter is present', async function () {
            const collection = await collectionsService.createCollection({
                title: 'I am automatic',
                description: 'testing automatic collection',
                type: 'manual'
            });

            assert.equal(collection.type, 'manual', 'Collection should be manual');
            assert.equal(collection.posts.length, 0, 'Collection should have no posts');

            const automaticCollection = await collectionsService.edit({
                id: collection.id,
                type: 'automatic',
                filter: 'featured:true'
            });

            assert.equal(automaticCollection?.posts.length, 2, 'Collection should have two featured post');
            assert.equal(automaticCollection?.posts[0].id, 'post-3-featured', 'Collection should have the correct post');
        });

        it('Updates the automatic collection posts when the filter is changed', async function () {
            let collection = await collectionsService.createCollection({
                title: 'I am automatic',
                description: 'testing automatic collection',
                type: 'automatic',
                filter: 'featured:true'
            });

            assert.equal(collection?.type, 'automatic', 'Collection should be automatic');
            assert.equal(collection?.posts.length, 2, 'Collection should have two featured post');
            assert.equal(collection?.posts[0].id, 'post-3-featured', 'Collection should have the correct post');
            assert.equal(collection?.posts[1].id, 'post-4-featured', 'Collection should have the correct post');

            let updatedCollection = await collectionsService.edit({
                id: collection.id,
                filter: 'slug:post-2'
            });

            assert.equal(updatedCollection?.posts.length, 1, 'Collection should have one post');
            assert.equal(updatedCollection?.posts[0].id, 'post-2', 'Collection should have the correct post');
        });

        // @NOTE: add a more comprehensive test as this one is too basic
        it('Updates all automatic collections', async function () {
            let collection1 = await collectionsService.createCollection({
                title: 'Featured Collection 1',
                description: 'testing automatic collection',
                type: 'automatic',
                filter: 'featured:true'
            });

            let collection2 = await collectionsService.createCollection({
                title: 'Featured Collection 2',
                description: 'testing automatic collection',
                type: 'automatic',
                filter: 'featured:true'
            });

            assert.equal(collection1.posts.length, 2);
            assert.equal(collection2.posts.length, 2);

            await collectionsService.updateAutomaticCollections();

            assert.equal(collection1.posts.length, 2);
            assert.equal(collection2.posts.length, 2);
        });
    });
});
