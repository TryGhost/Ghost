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
        assert.equal(Object.keys(serializedPost).length, 3, 'should only have 3 keys');
        assert.deepEqual(Object.keys(serializedPost), [
            'id',
            'title',
            'slug'
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
        assert.rejects(async () => {
            await Collection.create({
                id: 12345
            });
        }, (err: any) => {
            assert.equal(err.message, 'Invalid ID provided for Collection', 'Error message should match');
            return true;
        });
    });

    it('Throws an error when trying to create a Collection with invalid created_at date', async function () {
        assert.rejects(async () => {
            await Collection.create({
                created_at: 'invalid date'
            });
        }, (err: any) => {
            assert.equal(err.message, 'Invalid date provided for created_at', 'Error message should match');
            return true;
        });
    });
});
