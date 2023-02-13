const assert = require('assert');
const sinon = require('sinon');

const {TagsPublicRepository} = require('../index');
// @NOTE: This is a dirty import from the Ghost "core"!
//        extract it to it's own package and import here as require('@tryghost/adapter-base-cache-memory');
const MemoryCache = require('../../core/core/server/adapters/cache/Memory');

describe('TagsPublicRepository', function () {
    afterEach(function () {
        sinon.restore();
    });

    describe('getAll', function () {
        it('calls findPage on the model multiple times when cache NOT present', async function () {
            const tagStub = {
                findPage: sinon.stub().resolves(),
                permittedOptions: sinon.stub()
            };
            const repo = new TagsPublicRepository({
                Tag: tagStub
            });

            // first call
            await repo.getAll({
                limit: 'all'
            });
            // second call
            await repo.getAll({
                limit: 'all'
            });

            assert.equal(tagStub.findPage.callCount, 2, 'should be called same amount of times as getAll');
            assert.ok(tagStub.findPage.calledWith({limit: 'all'}));
        });

        it('calls findPage once and uses the cached value on subsequent calls', async function () {
            const tagStub = {
                findPage: sinon.stub().resolves({
                    data: [{
                        get(key) {
                            return key;
                        }
                    }],
                    meta: {}
                }),
                permittedOptions: sinon.stub().returns(['limit'])
            };
            const repo = new TagsPublicRepository({
                Tag: tagStub,
                cache: new MemoryCache()
            });

            // first call
            const dbTags = await repo.getAll({
                limit: 'all'
            });
            // second call
            const cacheTags = await repo.getAll({
                limit: 'all'
            });

            assert.equal(tagStub.findPage.callCount, 1, 'should be called once when cache is present');
            assert.ok(tagStub.findPage.calledWith({limit: 'all'}));

            assert.equal(dbTags, cacheTags, 'should return the same value from the cache');
        });

        it('calls findPage multiple times if the record is not present in the cache', async function () {
            const tagStub = {
                findPage: sinon.stub().resolves({
                    data: [{
                        get(key) {
                            return key;
                        }
                    }],
                    meta: {}
                }),
                permittedOptions: sinon.stub().returns(['limit'])
            };
            const cache = new MemoryCache();
            const repo = new TagsPublicRepository({
                Tag: tagStub,
                cache: cache
            });

            // first call
            await repo.getAll({
                limit: 'all'
            });

            // clear the cache
            cache.reset();

            // second call
            await repo.getAll({
                limit: 'all'
            });

            assert.equal(tagStub.findPage.callCount, 2, 'should be called every time the item is not in the cache');
            assert.ok(tagStub.findPage.calledWith({limit: 'all'}));
        });

        it('works with a cache that has an asynchronous interface', async function () {
            const tagStub = {
                findPage: sinon.stub().resolves({
                    data: [{
                        get(key) {
                            return key;
                        }
                    }],
                    meta: {}
                }),
                permittedOptions: sinon.stub().returns(['limit'])
            };

            const asyncMemoryCache = {
                get: sinon.stub().resolves('test'),
                set: sinon.stub().resolves()
            };

            const repo = new TagsPublicRepository({
                Tag: tagStub,
                cache: asyncMemoryCache
            });

            const result = await repo.getAll();

            assert.ok(asyncMemoryCache.get.calledOnce);
            assert.equal('test', result, 'should return the value from the cache');
        });
    });
});
