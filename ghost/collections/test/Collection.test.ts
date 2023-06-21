import assert from 'assert';
import ObjectID from 'bson-objectid';
import {Collection} from '../src/index';

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
            id: id.toHexString()
        });

        assert.equal(savedCollection.id, id.toHexString(), 'Collection should have same id');
    });

    it('Can create a Collection with predefined ObjectID instance', async function () {
        const id = new ObjectID();
        const savedCollection = await Collection.create({
            id: id
        });

        assert.equal(savedCollection.id, id.toHexString(), 'Collection should have same id');
    });

    it('Can create a Collection with predefined created_at and updated_at values', async function () {
        const createdAt = new Date();
        const updatedAt = new Date();
        const savedCollection = await Collection.create({
            created_at: createdAt,
            updated_at: updatedAt
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
                created_at: 'invalid date'
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

    it('Can add posts to different positions', async function () {
        const collection = await Collection.create({
            title: 'Testing adding posts'
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

    it('Cannot set non deletable collection to deleted', async function () {
        const collection = await Collection.create({
            title: 'Testing adding posts',
            deletable: false
        });

        assert.equal(collection.deleted, false);

        collection.deleted = true;

        assert.equal(collection.deleted, false);
    });

    it('Can set deletable collection to deleted', async function () {
        const collection = await Collection.create({
            title: 'Testing adding posts',
            deletable: true
        });

        assert.equal(collection.deleted, false);

        collection.deleted = true;

        assert.equal(collection.deleted, true);
    });
});
