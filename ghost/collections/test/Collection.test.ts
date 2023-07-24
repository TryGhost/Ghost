import assert from 'assert';
import ObjectID from 'bson-objectid';
import {Collection} from '../src/index';

const uniqueChecker = {
    async isUniqueSlug() {
        return true;
    }
};

describe('Collection', function () {
    it('Create Collection entity', async function () {
        const collection = await Collection.create({
            title: 'Test Collection'
        });

        assert.ok(collection instanceof Collection);
        assert.ok(collection.id, 'generated id should be set');
        assert.ok(ObjectID.isValid(collection.id), 'generated id should be valid ObjectID');

        assert.equal(collection.title, 'Test Collection');
        assert.ok(collection.createdAt instanceof Date);
        assert.ok(collection.updatedAt instanceof Date);
        assert.ok((collection.deleted === false), 'deleted should be false');
    });

    it('Cannot create a collection without a title', async function () {
        assert.rejects(async () => {
            await Collection.create({});
        });
    });

    it('Can serialize Collection to JSON', async function () {
        const collection = await Collection.create({
            title: 'Serialize me',
            posts: [{
                id: 'post-1'
            }, {
                id: 'post-2'
            }]
        });

        const json = collection.toJSON();

        assert.ok(json);
        assert.equal(json.id, collection.id);
        assert.equal(json.title, 'Serialize me');
        assert.ok(collection.createdAt instanceof Date);
        assert.ok(collection.updatedAt instanceof Date);
        assert.equal(Object.keys(json).length, 10, 'should only have 9 keys + 1 posts relation');
        assert.deepEqual(Object.keys(json), [
            'id',
            'title',
            'slug',
            'description',
            'type',
            'filter',
            'featureImage',
            'createdAt',
            'updatedAt',
            'posts'
        ]);

        assert.equal(json.posts.length, 2, 'should have 2 posts');
        const serializedPost = json.posts[0];
        assert.equal(Object.keys(serializedPost).length, 1, 'should only have 1 key');
        assert.deepEqual(Object.keys(serializedPost), [
            'id'
        ]);
    });

    it('Can create a Collection with predefined ID', async function () {
        const id = new ObjectID();
        const savedCollection = await Collection.create({
            id: id.toHexString(),
            title: 'Blah'
        });

        assert.equal(savedCollection.id, id.toHexString(), 'Collection should have same id');
    });

    it('Can create a Collection with predefined ObjectID instance', async function () {
        const id = new ObjectID();
        const savedCollection = await Collection.create({
            id: id,
            title: 'Bleh'
        });

        assert.equal(savedCollection.id, id.toHexString(), 'Collection should have same id');
    });

    it('Can create a Collection with predefined created_at and updated_at values', async function () {
        const createdAt = new Date();
        const updatedAt = new Date();
        const savedCollection = await Collection.create({
            created_at: createdAt,
            updated_at: updatedAt,
            title: 'Bluh'
        });

        assert.equal(savedCollection.createdAt, createdAt, 'Collection should have same created_at');
        assert.equal(savedCollection.updatedAt, updatedAt, 'Collection should have same updated_at');
    });

    it('Throws an error when trying to create a Collection with an invalid ID', async function () {
        await assert.rejects(async () => {
            await Collection.create({
                id: 12345
            });
        }, (err: any) => {
            assert.equal(err.message, 'Invalid ID provided for Collection', 'Error message should match');
            return true;
        });
    });

    it('Throws an error when trying to create a Collection with invalid created_at date', async function () {
        await assert.rejects(async () => {
            await Collection.create({
                created_at: 'invalid date',
                title: 'Blih'
            });
        }, (err: any) => {
            assert.equal(err.message, 'Invalid date provided for created_at', 'Error message should match');
            return true;
        });
    });

    it('Throws an error when trying to create an automatic Collection without a filter', async function () {
        await assert.rejects(async () => {
            await Collection.create({
                type: 'automatic',
                filter: null
            });
        }, (err: any) => {
            assert.equal(err.message, 'Invalid filter provided for automatic Collection', 'Error message should match');
            assert.equal(err.context, 'Automatic type of collection should always have a filter value', 'Error message should match');
            return true;
        });
    });

    describe('setSlug', function () {
        it('Does not bother checking uniqueness if slug is unchanged', async function () {
            const collection = await Collection.create({
                slug: 'test-collection',
                title: 'Testing edits',
                type: 'automatic',
                filter: 'featured:true'
            });

            await collection.setSlug('test-collection', {
                isUniqueSlug: () => {
                    throw new Error('Should not have checked uniqueness');
                }
            });
        });

        it('Throws an error if slug is not unique', async function () {
            const collection = await Collection.create({
                slug: 'test-collection',
                title: 'Testing edits',
                type: 'automatic',
                filter: 'featured:true'
            });

            assert.rejects(async () => {
                await collection.setSlug('not-unique', {
                    async isUniqueSlug() {
                        return false;
                    }
                });
            });
        });
    });

    describe('edit', function () {
        it('Can edit Collection values', async function () {
            const collection = await Collection.create({
                slug: 'test-collection',
                title: 'Testing edits',
                type: 'automatic',
                filter: 'featured:true'
            });

            assert.equal(collection.title, 'Testing edits');

            await collection.edit({
                title: 'Edited title',
                slug: 'edited-slug'
            }, uniqueChecker);

            assert.equal(collection.title, 'Edited title');
            assert.equal(collection.slug, 'edited-slug');
        });

        it('Throws when the collection filter is empty', async function () {
            const collection = await Collection.create({
                title: 'Testing edits',
                type: 'automatic',
                filter: 'featured:true'
            });

            assert.rejects(async () => {
                await collection.edit({
                    filter: null
                }, uniqueChecker);
            }, (err: any) => {
                assert.equal(err.message, 'Invalid filter provided for automatic Collection', 'Error message should match');
                assert.equal(err.context, 'Automatic type of collection should always have a filter value', 'Error message should match');
                return true;
            });
        });

        it('Does not throw when collection filter is empty for automatic "latest" collection', async function (){
            const collection = await Collection.create({
                title: 'Latest',
                slug: 'latest',
                type: 'automatic',
                filter: ''
            });

            const editedCollection = await collection.edit({
                title: 'Edited latest',
                filter: ''
            }, uniqueChecker);

            assert.equal(editedCollection.title, 'Edited latest');
            assert.equal(editedCollection.filter, '');
        });
    });

    it('Can add posts to different positions', async function () {
        const collection = await Collection.create({
            title: 'Testing adding posts',
            type: 'manual'
        });

        assert(collection.posts.length === 0);

        const posts = [{
            id: '0'
        }, {
            id: '1'
        }, {
            id: '2'
        }, {
            id: '3'
        }];

        collection.addPost(posts[0]);
        collection.addPost(posts[1]);
        collection.addPost(posts[2], 1);
        collection.addPost(posts[3], 0);

        assert(collection.posts.length as number === 4);
        assert(collection.posts[0] === '3');

        collection.addPost(posts[3], -1);
        assert(collection.posts.length as number === 4);
        assert(collection.posts[collection.posts.length - 2] === '3');
    });

    it('Adds a post to an automatic collection when it matches the filter', async function () {
        const collection = await Collection.create({
            title: 'Testing adding posts',
            type: 'automatic',
            filter: 'featured:true'
        });

        assert.equal(collection.posts.length, 0, 'Collection should have no posts');

        const added = await collection.addPost({
            id: '0',
            featured: false
        });

        assert.equal(added, false);
        assert.equal(collection.posts.length, 0, 'The non-featured post should not have been added');

        const featuredAdded = await collection.addPost({
            id: '1',
            featured: true
        });

        assert.equal(featuredAdded, true);
        assert.equal(collection.posts.length, 1, 'The featured post should have been added');
    });

    it('Removes a post by id', async function () {
        const collection = await Collection.create({
            title: 'Testing adding posts'
        });

        assert.equal(collection.posts.length, 0);

        collection.addPost({
            id: '0'
        });

        assert.equal(collection.posts.length, 1);

        collection.removePost('0');

        assert.equal(collection.posts.length, 0);
    });

    it('Cannot set "latest" collection to deleted', async function () {
        const collection = await Collection.create({
            title: 'Testing adding posts',
            slug: 'latest'
        });

        assert.equal(collection.deleted, false);

        collection.deleted = true;

        assert.equal(collection.deleted, false);
    });

    it('Cannot set featured collection to deleted', async function () {
        const collection = await Collection.create({
            title: 'Testing adding posts',
            slug: 'featured'
        });

        assert.equal(collection.deleted, false);

        collection.deleted = true;

        assert.equal(collection.deleted, false);
    });

    it('Can set other collection to deleted', async function () {
        const collection = await Collection.create({
            title: 'Testing adding posts',
            slug: 'non-internal-slug'
        });

        assert.equal(collection.deleted, false);

        collection.deleted = true;

        assert.equal(collection.deleted, true);
    });

    describe('postMatchesFilter', function () {
        it('Can match a post with a filter', async function () {
            const collection = await Collection.create({
                title: 'Testing filtering posts',
                type: 'automatic',
                filter: 'featured:true'
            });

            const featuredPost = {
                id: '0',
                featured: true
            };

            const nonFeaturedPost = {
                id: '1',
                featured: false
            };

            assert.ok(collection.postMatchesFilter(featuredPost), 'Post should match the filter');
            assert.ok(!collection.postMatchesFilter(nonFeaturedPost), 'Post should not match the filter');
        });

        it('Can match a post with a tag filter', async function () {
            const collection = await Collection.create({
                title: 'Testing filtering posts',
                type: 'automatic',
                filter: 'tag:avocado'
            });

            const avocadoPost = {
                id: '0',
                tags: [{
                    slug: 'avocado'
                }]
            };
            const nonAvocadoPost = {
                id: '1',
                tags: [{
                    slug: 'not-avocado'
                }]
            };

            assert.ok(collection.postMatchesFilter(avocadoPost), 'Post should match the filter');
            assert.ok(!collection.postMatchesFilter(nonAvocadoPost), 'Post should not match the filter');
        });

        it('Can match a post with a tags filter', async function () {
            const collection = await Collection.create({
                title: 'Testing filtering posts',
                type: 'automatic',
                filter: 'tags:avocado'
            });

            const avocadoPost = {
                id: '0',
                tags: [{
                    slug: 'avocado'
                }]
            };
            const nonAvocadoPost = {
                id: '1',
                tags: [{
                    slug: 'not-avocado'
                }]
            };

            assert.ok(collection.postMatchesFilter(avocadoPost), 'Post should match the filter');
            assert.ok(!collection.postMatchesFilter(nonAvocadoPost), 'Post should not match the filter');
        });
    });
});
