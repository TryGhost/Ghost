import assert from 'assert';
import {CollectionsService, CollectionsRepositoryInMemory, PostsDataRepositoryInMemory} from '../src/index';
import {PostDTO} from '../src/PostDTO';

import {posts as postFixtures} from './fixtures/posts';

const buildPostsRepositoryWithFixtures = async (): Promise<PostsDataRepositoryInMemory> => {
    const repository = new PostsDataRepositoryInMemory();

    for (const post of postFixtures) {
        const postDTO = await PostDTO.map(post);
        await repository.save(postDTO);
    }

    return repository;
};

describe('CollectionsService', function () {
    let collectionsService: CollectionsService;
    let postsRepository: PostsDataRepositoryInMemory;

    beforeEach(async function () {
        const collectionsRepository = new CollectionsRepositoryInMemory();
        postsRepository = await buildPostsRepositoryWithFixtures();

        collectionsService = new CollectionsService({
            collectionsRepository,
            postsRepository
        });
    });

    it('Instantiates a CollectionsService', function () {
        assert.ok(collectionsService, 'CollectionsService should initialize');
    });

    it('Can do CRUD operations on a collection', async function () {
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
        assert.equal(allCollections.data.length, 1, 'There should be one collection');

        await collectionsService.destroy(savedCollection.id);
        const deletedCollection = await collectionsService.getById(savedCollection.id);

        assert.equal(deletedCollection, null, 'Collection should be deleted');
    });

    describe('edit', function () {
        it('Can edit existing collection', async function () {
            const savedCollection = await collectionsService.save({
                title: 'testing collections',
                description: 'testing collections description',
                type: 'manual',
                deleted: false
            });

            const editedCollection = await collectionsService.edit({
                id: savedCollection.id,
                description: 'Edited description'
            });

            assert.equal(editedCollection?.description, 'Edited description', 'Collection description should be edited');
        });

        it('Resolves to null when editing unexistend collection', async function () {
            const editedCollection = await collectionsService.edit({
                id: '12345'
            });

            assert.equal(editedCollection, null, 'Collection should be null');
        });

        it('Adds a Post to a Collection', async function () {
            const collection = await collectionsService.save({
                title: 'testing collections',
                description: 'testing collections description',
                type: 'manual',
                deleted: false
            });

            const posts = await postsRepository.getAll();

            const editedCollection = await collectionsService.edit({
                id: collection.id,
                posts: [{
                    id: posts[0].id
                }]
            });

            assert.equal(editedCollection?.posts.length, 1, 'Collection should have one post');
            assert.equal(editedCollection?.posts[0].id, posts[0].id, 'Collection should have the correct post');
        });
    });
});
