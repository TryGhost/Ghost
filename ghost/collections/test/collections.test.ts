import assert from 'assert/strict';
import sinon from 'sinon';
import DomainEvents from '@tryghost/domain-events';
import {
    CollectionsService,
    CollectionsRepositoryInMemory,
    PostAddedEvent,
    PostEditedEvent,
    TagDeletedEvent
} from '../src/index';
import {
    PostsBulkUnpublishedEvent,
    PostsBulkFeaturedEvent,
    PostsBulkUnfeaturedEvent,
    PostsBulkAddTagsEvent
} from '@tryghost/post-events';
import {PostsRepositoryInMemory} from './fixtures/PostsRepositoryInMemory';
import {posts as postFixtures} from './fixtures/posts';
import {CollectionPost} from '../src/CollectionPost';

const initPostsRepository = async (posts: any): Promise<PostsRepositoryInMemory> => {
    const postsRepository = new PostsRepositoryInMemory();

    for (const post of posts) {
        const collectionPost = {
            id: post.id,
            title: post.title,
            slug: post.slug,
            featured: post.featured,
            published_at: post.published_at?.toISOString(),
            tags: post.tags,
            deleted: false
        };

        await postsRepository.save(collectionPost as CollectionPost & {deleted: false});
    }

    return postsRepository;
};

describe('CollectionsService', function () {
    let collectionsService: CollectionsService;
    let postsRepository: PostsRepositoryInMemory;

    beforeEach(async function () {
        const collectionsRepository = new CollectionsRepositoryInMemory();
        postsRepository = await initPostsRepository(postFixtures);

        collectionsService = new CollectionsService({
            collectionsRepository,
            postsRepository,
            DomainEvents,
            slugService: {
                async generate(input) {
                    return input.replace(/\s+/g, '-').toLowerCase();
                }
            }
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
        assert.ok(createdCollection.id, 'Collection should have an id');
        assert.equal(createdCollection.title, 'testing collections', 'Collection title should match');

        const allCollections = await collectionsService.getAll();
        assert.equal(allCollections.data.length, 1, 'There should be one collection');

        await collectionsService.destroy(createdCollection.id);
        const deletedCollection = await collectionsService.getById(savedCollection.id);

        assert.equal(deletedCollection, null, 'Collection should be deleted');
    });

    it('Can retrieve a collection by slug', async function () {
        const savedCollection = await collectionsService.createCollection({
            title: 'slug test',
            slug: 'get-me-by-slug',
            type: 'manual',
            filter: null
        });

        const retrievedCollection = await collectionsService.getBySlug('get-me-by-slug');
        assert.ok(retrievedCollection, 'Collection should be saved');
        assert.ok(retrievedCollection.slug, 'Collection should have a slug');
        assert.equal(savedCollection.title, 'slug test', 'Collection title should match');

        const nonExistingCollection = await collectionsService.getBySlug('i-do-not-exist');
        assert.equal(nonExistingCollection, null, 'Collection should not exist');
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
                slug: 'testing-collections',
                type: 'manual'
            });

            const collection2 = await collectionsService.createCollection({
                title: 'testing collections 1',
                slug: '1-testing-collections',
                type: 'manual'
            });

            await collectionsService.addPostToCollection(collection.id, postFixtures[0]);
            await collectionsService.addPostToCollection(collection2.id, postFixtures[0]);

            const collections = await collectionsService.getCollectionsForPost(postFixtures[0].id);

            assert.equal(collections.length, 2, 'There should be one collection');
            assert.equal(collections[0].id, collection2.id, 'Collections should be sorted by slug');
            assert.equal(collections[1].id, collection.id, 'Collections should be sorted by slug');
        });
    });

    describe('addPostToCollection', function () {
        it('Can add a Post to a Collection', async function () {
            const collection = await collectionsService.createCollection({
                title: 'testing collections',
                description: 'testing collections description',
                type: 'manual'
            });

            const editedCollection = await collectionsService.addPostToCollection(collection.id, postFixtures[0]);

            assert.equal(editedCollection?.posts.length, 1, 'Collection should have one post');
            assert.equal(editedCollection?.posts[0].id, postFixtures[0].id, 'Collection should have the correct post');
        });

        it('Does not error when trying to add a post to a collection that does not exist', async function () {
            const editedCollection = await collectionsService.addPostToCollection('fake id', postFixtures[0]);
            assert(editedCollection === null);
        });
    });

    describe('latest collection', function () {
        it('Includes all posts when fetched directly', async function () {
            await collectionsService.createCollection({
                title: 'Latest',
                slug: 'latest',
                type: 'automatic',
                filter: ''
            });
            const collection = await collectionsService.getBySlug('latest');
            assert(collection?.posts.length === 4);
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
                feature_image: '/assets/images/edited.jpg',
                slug: 'changed'
            });

            assert.equal(editedCollection?.title, 'Edited title', 'Collection title should be edited');
            assert.equal(editedCollection?.slug, 'changed', 'Collection slug should be edited');
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
                    id: postFixtures[0].id
                }]
            });

            assert.equal(editedCollection?.posts.length, 1, 'Collection should have one post');
            assert.equal(editedCollection?.posts[0].id, postFixtures[0].id, 'Collection should have the correct post');
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
                    id: postFixtures[0].id
                }, {
                    id: postFixtures[1].id
                }]
            });

            assert.equal(editedCollection?.posts.length, 2, 'Collection should have two posts');

            editedCollection = await collectionsService.removePostFromCollection(collection.id, postFixtures[0].id);

            assert.equal(editedCollection?.posts.length, 1, 'Collection should have one posts');
        });

        it('Returns null when removing post from non existing collection', async function () {
            const collection = await collectionsService.removePostFromCollection('i-do-not-exist', postFixtures[0].id);

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
                filter: 'featured:true+published_at:>2023-05-20'
            });

            assert.equal(updatedCollection?.posts.length, 1, 'Collection should have one post');
            assert.equal(updatedCollection?.posts[0].id, 'post-3-featured', 'Collection should have the correct post');
        });

        describe('updateCollections', function () {
            let automaticFeaturedCollection: any;
            let automaticNonFeaturedCollection: any;
            let manualCollection: any;

            beforeEach(async function () {
                automaticFeaturedCollection = await collectionsService.createCollection({
                    title: 'Featured Collection',
                    description: 'testing automatic collection',
                    type: 'automatic',
                    filter: 'featured:true'
                });

                automaticNonFeaturedCollection = await collectionsService.createCollection({
                    title: 'Non-Featured Collection',
                    description: 'testing automatic collection',
                    type: 'automatic',
                    filter: 'featured:false'
                });

                manualCollection = await collectionsService.createCollection({
                    title: 'Manual Collection',
                    description: 'testing manual collection',
                    type: 'manual'
                });

                await collectionsService.addPostToCollection(manualCollection.id, postFixtures[0]);
                await collectionsService.addPostToCollection(manualCollection.id, postFixtures[1]);
            });

            afterEach(async function () {
                await collectionsService.destroy(automaticFeaturedCollection.id);
                await collectionsService.destroy(automaticNonFeaturedCollection.id);
                await collectionsService.destroy(manualCollection.id);
            });

            it('Updates all automatic collections when a tag is deleted', async function () {
                const collectionsRepository = new CollectionsRepositoryInMemory();
                postsRepository = await initPostsRepository([
                    {
                        id: 'post-1',
                        url: 'http://localhost:2368/post-1/',
                        title: 'Post 1',
                        slug: 'post-1',
                        featured: false,
                        tags: [{slug: 'to-be-deleted'}, {slug: 'other-tag'}],
                        created_at: new Date('2023-03-15T07:19:07.447Z'),
                        updated_at: new Date('2023-03-15T07:19:07.447Z'),
                        published_at: new Date('2023-03-15T07:19:07.447Z')
                    }, {
                        id: 'post-2',
                        url: 'http://localhost:2368/post-2/',
                        title: 'Post 2',
                        slug: 'post-2',
                        featured: false,
                        tags: [{slug: 'to-be-deleted'}, {slug: 'other-tag'}],
                        created_at: new Date('2023-04-05T07:20:07.447Z'),
                        updated_at: new Date('2023-04-05T07:20:07.447Z'),
                        published_at: new Date('2023-04-05T07:20:07.447Z')
                    }
                ]);

                collectionsService = new CollectionsService({
                    collectionsRepository,
                    postsRepository,
                    DomainEvents,
                    slugService: {
                        async generate(input) {
                            return input.replace(/\s+/g, '-').toLowerCase();
                        }
                    }
                });

                const automaticCollectionWithTag = await collectionsService.createCollection({
                    title: 'Automatic Collection with Tag',
                    description: 'testing automatic collection with tag',
                    type: 'automatic',
                    filter: 'tags:to-be-deleted'
                });

                const automaticCollectionWithoutTag = await collectionsService.createCollection({
                    title: 'Automatic Collection without Tag',
                    description: 'testing automatic collection without tag',
                    type: 'automatic',
                    filter: 'tags:other-tag'
                });

                assert.equal((await collectionsService.getById(automaticCollectionWithTag.id))?.posts.length, 2);
                assert.equal((await collectionsService.getById(automaticCollectionWithoutTag.id))?.posts.length, 2);

                collectionsService.subscribeToEvents();
                const tagDeletedEvent = TagDeletedEvent.create({
                    id: 'to-be-deleted'
                });

                const posts = await postsRepository.getAll();

                for (const post of posts) {
                    post.tags = post.tags.filter(tag => tag.slug !== 'to-be-deleted');
                    await postsRepository.save(post);
                }

                DomainEvents.dispatch(tagDeletedEvent);
                await DomainEvents.allSettled();

                assert.equal((await collectionsService.getById(automaticCollectionWithTag.id))?.posts.length, 0);
                assert.equal((await collectionsService.getById(automaticCollectionWithoutTag.id))?.posts.length, 2);
            });

            it('Updates all collections when post tags are added in bulk', async function () {
                const collectionsRepository = new CollectionsRepositoryInMemory();
                postsRepository = await initPostsRepository([
                    {
                        id: 'post-1',
                        url: 'http://localhost:2368/post-1/',
                        title: 'Post 1',
                        slug: 'post-1',
                        featured: false,
                        tags: [{slug: 'existing-tag'}],
                        created_at: new Date('2023-03-15T07:19:07.447Z'),
                        updated_at: new Date('2023-03-15T07:19:07.447Z'),
                        published_at: new Date('2023-03-15T07:19:07.447Z')
                    }, {
                        id: 'post-2',
                        url: 'http://localhost:2368/post-2/',
                        title: 'Post 2',
                        slug: 'post-2',
                        featured: false,
                        tags: [],
                        created_at: new Date('2023-04-05T07:20:07.447Z'),
                        updated_at: new Date('2023-04-05T07:20:07.447Z'),
                        published_at: new Date('2023-04-05T07:20:07.447Z')
                    }
                ]);

                collectionsService = new CollectionsService({
                    collectionsRepository,
                    postsRepository,
                    DomainEvents,
                    slugService: {
                        async generate(input) {
                            return input.replace(/\s+/g, '-').toLowerCase();
                        }
                    }
                });

                const automaticCollectionWithExistingTag = await collectionsService.createCollection({
                    title: 'Automatic Collection with Tag',
                    description: 'testing automatic collection with tag',
                    type: 'automatic',
                    filter: 'tags:existing-tag'
                });

                const automaticCollectionWithBulkAddedTag = await collectionsService.createCollection({
                    title: 'Automatic Collection without Tag',
                    description: 'testing automatic collection without tag',
                    type: 'automatic',
                    filter: 'tags:to-be-created'
                });

                assert.equal((await collectionsService.getById(automaticCollectionWithExistingTag.id))?.posts.length, 1);
                assert.equal((await collectionsService.getById(automaticCollectionWithBulkAddedTag.id))?.posts.length, 0);

                collectionsService.subscribeToEvents();

                const posts = await postsRepository.getAll();

                for (const post of posts) {
                    post.tags.push({slug: 'to-be-created'});
                    await postsRepository.save(post);
                }

                const postsBulkAddTagsEvent = PostsBulkAddTagsEvent.create([
                    'post-1',
                    'post-2'
                ]);

                DomainEvents.dispatch(postsBulkAddTagsEvent);
                await DomainEvents.allSettled();

                assert.equal((await collectionsService.getById(automaticCollectionWithExistingTag.id))?.posts.length, 1);
                assert.equal((await collectionsService.getById(automaticCollectionWithBulkAddedTag.id))?.posts.length, 2);
            });

            it('Updates all collections when post is deleted', async function () {
                assert.equal((await collectionsService.getById(automaticFeaturedCollection.id))?.posts?.length, 2);
                assert.equal((await collectionsService.getById(automaticNonFeaturedCollection.id))?.posts.length, 2);
                assert.equal((await collectionsService.getById(manualCollection.id))?.posts.length, 2);

                await collectionsService.removePostFromAllCollections(postFixtures[0].id);

                assert.equal((await collectionsService.getById(automaticFeaturedCollection.id))?.posts?.length, 2);
                assert.equal((await collectionsService.getById(automaticNonFeaturedCollection.id))?.posts.length, 1);
                assert.equal((await collectionsService.getById(manualCollection.id))?.posts.length, 1);
            });

            it('Updates all collections when posts are deleted in bulk', async function () {
                assert.equal((await collectionsService.getById(automaticFeaturedCollection.id))?.posts?.length, 2);
                assert.equal((await collectionsService.getById(automaticNonFeaturedCollection.id))?.posts.length, 2);
                assert.equal((await collectionsService.getById(manualCollection.id))?.posts.length, 2);

                const deletedPostIds = [
                    postFixtures[0].id,
                    postFixtures[1].id
                ];
                await collectionsService.removePostsFromAllCollections(deletedPostIds);

                assert.equal((await collectionsService.getById(automaticFeaturedCollection.id))?.posts?.length, 2);
                assert.equal((await collectionsService.getById(automaticNonFeaturedCollection.id))?.posts.length, 0);
                assert.equal((await collectionsService.getById(manualCollection.id))?.posts.length, 0);
            });

            it('Updates collections with publish filter when PostsBulkUnpublishedEvent event is produced', async function () {
                const publishedPostsCollection = await collectionsService.createCollection({
                    title: 'Published Posts',
                    slug: 'published-posts',
                    type: 'automatic',
                    filter: 'published_at:>=2023-05-00T00:00:00.000Z'
                });

                assert.equal((await collectionsService.getById(publishedPostsCollection.id))?.posts.length, 2, 'Only two post fixtures are published on the 5th month of 2023');

                assert.equal((await collectionsService.getById(automaticFeaturedCollection.id))?.posts?.length, 2);
                assert.equal((await collectionsService.getById(automaticNonFeaturedCollection.id))?.posts.length, 2);
                assert.equal((await collectionsService.getById(manualCollection.id))?.posts.length, 2);

                collectionsService.subscribeToEvents();

                await postsRepository.save(Object.assign(postFixtures[2], {
                    published_at: null
                }));
                const postsBulkUnpublishedEvent = PostsBulkUnpublishedEvent.create([
                    postFixtures[2].id
                ]);

                DomainEvents.dispatch(postsBulkUnpublishedEvent);
                await DomainEvents.allSettled();

                assert.equal((await collectionsService.getById(publishedPostsCollection.id))?.posts.length, 1, 'Only one post left as published on the 5th month of 2023');

                assert.equal((await collectionsService.getById(automaticFeaturedCollection.id))?.posts.length, 2, 'There should be no change to the featured filter collection');
                assert.equal((await collectionsService.getById(automaticNonFeaturedCollection.id))?.posts.length, 2, 'There should be no change to the non-featured filter collection');
                assert.equal((await collectionsService.getById(manualCollection.id))?.posts.length, 2, 'There should be no change to the manual collection');
            });

            it('Updates collections with publish filter when PostsBulkFeaturedEvent/PostsBulkUnfeaturedEvent events are produced', async function () {
                assert.equal((await collectionsService.getById(automaticFeaturedCollection.id))?.posts?.length, 2);
                assert.equal((await collectionsService.getById(automaticNonFeaturedCollection.id))?.posts.length, 2);
                assert.equal((await collectionsService.getById(manualCollection.id))?.posts.length, 2);

                collectionsService.subscribeToEvents();

                const featuredPost = await postsRepository.getById(postFixtures[0].id);
                if (featuredPost) {
                    featuredPost.featured = true;
                }

                await postsRepository.save(featuredPost as CollectionPost & {deleted: false});

                const postsBulkFeaturedEvent = PostsBulkFeaturedEvent.create([
                    postFixtures[0].id
                ]);

                DomainEvents.dispatch(postsBulkFeaturedEvent);
                await DomainEvents.allSettled();

                assert.equal((await collectionsService.getById(automaticFeaturedCollection.id))?.posts.length, 3, 'There should be one extra post in the featured filter collection');
                assert.equal((await collectionsService.getById(automaticNonFeaturedCollection.id))?.posts.length, 1, 'There should be one less posts in the non-featured filter collection');
                assert.equal((await collectionsService.getById(manualCollection.id))?.posts.length, 2, 'There should be no change to the manual collection');

                const unFeaturedPost2 = await postsRepository.getById(postFixtures[2].id);
                if (unFeaturedPost2) {
                    unFeaturedPost2.featured = false;
                }
                await postsRepository.save(unFeaturedPost2 as CollectionPost & {deleted: false});

                const unFeaturedPost3 = await postsRepository.getById(postFixtures[3].id);
                if (unFeaturedPost3) {
                    unFeaturedPost3.featured = false;
                }
                await postsRepository.save(unFeaturedPost3 as CollectionPost & {deleted: false});

                const postsBulkUnfeaturedEvent = PostsBulkUnfeaturedEvent.create([
                    postFixtures[2].id,
                    postFixtures[3].id
                ]);

                DomainEvents.dispatch(postsBulkUnfeaturedEvent);
                await DomainEvents.allSettled();

                assert.equal((await collectionsService.getById(automaticFeaturedCollection.id))?.posts.length, 1, 'There should be two less posts in the featured filter collection');
                assert.equal((await collectionsService.getById(automaticNonFeaturedCollection.id))?.posts.length, 3, 'There should be two extra posts in the non-featured filter collection');
                assert.equal((await collectionsService.getById(manualCollection.id))?.posts.length, 2, 'There should be no change to the manual collection');
            });

            it('Updates only index collection when a non-featured post is added', async function () {
                assert.equal((await collectionsService.getById(automaticFeaturedCollection.id))?.posts?.length, 2);
                assert.equal((await collectionsService.getById(automaticNonFeaturedCollection.id))?.posts.length, 2);
                assert.equal((await collectionsService.getById(manualCollection.id))?.posts.length, 2);

                collectionsService.subscribeToEvents();
                const postAddedEvent = PostAddedEvent.create({
                    id: 'non-featured-post',
                    featured: false
                });

                DomainEvents.dispatch(postAddedEvent);
                await DomainEvents.allSettled();

                assert.equal((await collectionsService.getById(automaticFeaturedCollection.id))?.posts?.length, 2);
                assert.equal((await collectionsService.getById(automaticNonFeaturedCollection.id))?.posts.length, 3);
                assert.equal((await collectionsService.getById(manualCollection.id))?.posts.length, 2);
            });

            it('Moves post from featured to non featured collection when the featured attribute is changed', async function () {
                collectionsService.subscribeToEvents();
                const newFeaturedPost: CollectionPost & {deleted: false} = {
                    id: 'post-featured',
                    featured: false,
                    published_at: new Date('2023-03-16T07:19:07.447Z'),
                    tags: [],
                    deleted: false
                };
                await postsRepository.save(newFeaturedPost);
                const updateCollectionEvent = PostEditedEvent.create({
                    id: newFeaturedPost.id,
                    current: {
                        id: newFeaturedPost.id,
                        featured: false
                    },
                    previous: {
                        id: newFeaturedPost.id,
                        featured: true
                    }
                });

                DomainEvents.dispatch(updateCollectionEvent);
                await DomainEvents.allSettled();

                assert.equal((await collectionsService.getById(automaticFeaturedCollection.id))?.posts?.length, 2);
                assert.equal((await collectionsService.getById(automaticNonFeaturedCollection.id))?.posts.length, 3);
                assert.equal((await collectionsService.getById(manualCollection.id))?.posts.length, 2);

                // change featured back to true
                const updateCollectionEventBackToFeatured = PostEditedEvent.create({
                    id: newFeaturedPost.id,
                    current: {
                        id: newFeaturedPost.id,
                        featured: true
                    },
                    previous: {
                        id: newFeaturedPost.id,
                        featured: false
                    }
                });

                DomainEvents.dispatch(updateCollectionEventBackToFeatured);
                await DomainEvents.allSettled();

                assert.equal((await collectionsService.getById(automaticFeaturedCollection.id))?.posts?.length, 3);
                assert.equal((await collectionsService.getById(automaticNonFeaturedCollection.id))?.posts.length, 2);
                assert.equal((await collectionsService.getById(manualCollection.id))?.posts.length, 2);
            });

            it('Does nothing when the PostEditedEvent contains no relevant changes', async function () {
                collectionsService.subscribeToEvents();
                const updatePostInMatchingCollectionsSpy = sinon.spy(collectionsService, 'updatePostInMatchingCollections');
                const postEditEvent = PostEditedEvent.create({
                    id: 'something',
                    current: {
                        id: 'unique-post-id',
                        status: 'scheduled',
                        featured: true,
                        tags: ['they', 'do', 'not', 'change']
                    },
                    previous: {
                        id: 'unique-post-id',
                        status: 'published',
                        featured: true,
                        tags: ['they', 'do', 'not', 'change']
                    }
                });

                DomainEvents.dispatch(postEditEvent);
                await DomainEvents.allSettled();

                assert.equal(updatePostInMatchingCollectionsSpy.callCount, 0, 'updatePostInMatchingCollections method should not have been called');
            });
        });
    });
});
