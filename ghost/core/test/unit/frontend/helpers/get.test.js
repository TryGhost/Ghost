const assert = require('node:assert/strict');
const sinon = require('sinon');
const {SafeString} = require('../../../../core/frontend/services/handlebars');
const configUtils = require('../../../utils/config-utils');
const loggingLib = require('@tryghost/logging');

// Stuff we are testing
const get = require('../../../../core/frontend/helpers/get');
const {querySimplePath} = get;
const models = require('../../../../core/server/models');
const api = require('../../../../core/server/api').endpoints;
const maxLimitCap = require('../../../../core/shared/max-limit-cap');

describe('{{#get}} helper', function () {
    let fn;
    let inverse;
    let locals = {};
    let logging;

    before(function () {
        models.init();
    });

    beforeEach(function () {
        fn = sinon.spy();
        inverse = sinon.spy();

        locals = {root: {}, globalProp: {foo: 'bar'}};

        // We're testing how the browse stub is called, not the response.
        // Each get call errors since the posts resource is not populated.
        logging = {
            error: sinon.stub(loggingLib, 'error'),
            warn: sinon.stub(loggingLib, 'warn')
        };
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('cacheability optimisation', function () {
        it('Ignores non posts', function () {
            const apiOptions = {
                filter: 'id:-abcdef1234567890abcdef12'
            };
            const {
                options,
                parseResult
            } = get.optimiseFilterCacheability('not-posts', apiOptions);
            assert.equal(options.filter, 'id:-abcdef1234567890abcdef12');
            assert.deepEqual(parseResult({not: 'modified'}), {not: 'modified'});
        });
        it('Changes the filter for simple id negations', function () {
            const apiOptions = {
                filter: 'id:-abcdef1234567890abcdef12',
                limit: 1
            };
            const {
                options,
                parseResult
            } = get.optimiseFilterCacheability('posts', apiOptions);
            assert.equal(options.filter, 'id:-null');
            assert.deepEqual(parseResult({
                posts: [{
                    id: 'abcdef1234567890abcdef12'
                }, {
                    id: '1234567890abcdef12345678'
                }]
            }), {
                posts: [{
                    id: '1234567890abcdef12345678'
                }],
                meta: {
                    cacheabilityOptimisation: true
                }
            });
        });
    });

    describe('context preparation', function () {
        const meta = {pagination: {}};

        beforeEach(function () {
            locals = {root: {_locals: {}}};

            sinon.stub(api, 'postsPublic').get(() => {
                return {
                    browse: sinon.stub().resolves({posts: [{feature_image_caption: '<a href="#">A link</a>'}], meta: meta})
                };
            });
        });

        it('converts html strings to SafeString', function (done) {
            get.call(
                {},
                'posts',
                {hash: {}, data: locals, fn: fn, inverse: inverse}
            ).then(function () {
                sinon.assert.called(fn);
                const args = fn.firstCall.args[0];
                assert(args && typeof args === 'object');
                assert('posts' in args);

                assert(fn.firstCall.args[0].posts[0].feature_image_caption instanceof SafeString);

                done();
            }).catch(done);
        });
    });

    describe('authors', function () {
        const meta = {pagination: {}};

        beforeEach(function () {
            locals = {root: {_locals: {}}};

            sinon.stub(api, 'authorsPublic').get(() => {
                return {
                    browse: sinon.stub().resolves({authors: [], meta: meta})
                };
            });
        });

        it('browse authors', function (done) {
            get.call(
                {},
                'authors',
                {hash: {}, data: locals, fn: fn, inverse: inverse}
            ).then(function () {
                sinon.assert.called(fn);
                const args = fn.firstCall.args[0];
                assert(args && typeof args === 'object');
                assert('authors' in args);
                assert.deepEqual(fn.firstCall.args[0].authors, []);
                sinon.assert.notCalled(inverse);

                done();
            }).catch(done);
        });
    });

    describe('newsletters', function () {
        const meta = {pagination: {}};

        beforeEach(function () {
            locals = {root: {_locals: {}}};

            sinon.stub(api, 'newslettersPublic').get(() => {
                return {
                    browse: sinon.stub().resolves({newsletters: [], meta: meta})
                };
            });
        });

        it('browse newsletters', function (done) {
            get.call(
                {},
                'newsletters',
                {hash: {}, data: locals, fn: fn, inverse: inverse}
            ).then(function () {
                sinon.assert.called(fn);
                const args = fn.firstCall.args[0];
                assert(args && typeof args === 'object');
                assert('newsletters' in args);
                assert.deepEqual(fn.firstCall.args[0].newsletters, []);
                sinon.assert.notCalled(inverse);

                done();
            }).catch(done);
        });
    });

    describe('general error handling', function () {
        it('should return an error for an unknown resource', function (done) {
            get.call(
                {},
                'magic',
                {hash: {}, data: locals, fn: fn, inverse: inverse}
            ).then(function () {
                sinon.assert.notCalled(fn);
                sinon.assert.calledOnce(inverse);
                const args = inverse.firstCall.args[1];
                assert(args && typeof args === 'object');
                assert('data' in args);
                const data = args.data;
                assert(data && typeof data === 'object');
                assert('error' in data);
                assert.equal(data.error, 'Invalid "magic" resource given to get helper');

                done();
            }).catch(done);
        });

        it('should handle error from the API', function (done) {
            get.call(
                {},
                'posts',
                {hash: {slug: 'thing!'}, data: locals, fn: fn, inverse: inverse}
            ).then(function () {
                sinon.assert.notCalled(fn);
                sinon.assert.calledOnce(inverse);
                const args = inverse.firstCall.args[1];
                assert(args && typeof args === 'object');
                assert('data' in args);
                const data = args.data;
                assert(data && typeof data === 'object');
                assert('error' in data);
                assert.match(data.error, /^Validation/);

                done();
            }).catch(done);
        });

        it('should show warning for call without any options', function (done) {
            get.call(
                {},
                'posts',
                {data: locals}
            ).then(function () {
                sinon.assert.notCalled(fn);
                sinon.assert.notCalled(inverse);

                done();
            }).catch(done);
        });
    });

    describe('path resolution', function () {
        let browseStub;
        let readStub;
        const pubDate = new Date();

        const resource = {
            post: {id: 3, title: 'Test 3', author: {slug: 'cameron'}, tags: [{slug: 'test'}, {slug: 'magic'}], published_at: pubDate}
        };

        beforeEach(function () {
            browseStub = sinon.stub().resolves();
            readStub = sinon.stub().resolves();
            sinon.stub(api, 'postsPublic').get(() => {
                return {
                    browse: browseStub,
                    read: readStub
                };
            });
        });

        it('should resolve post.tags alias', function (done) {
            get.call(
                resource,
                'posts',
                {hash: {filter: 'tags:[{{post.tags}}]'}, data: locals, fn: fn, inverse: inverse}
            ).then(function () {
                assert(Array.isArray(browseStub.firstCall.args));
                assert.equal(browseStub.firstCall.args.length, 1);
                const options = browseStub.firstCall.args[0];
                assert(options && typeof options === 'object');
                assert('filter' in options);
                assert.equal(options.filter, 'tags:[test,magic]');

                done();
            }).catch(done);
        });

        it('should resolve post.author alias', function (done) {
            get.call(
                resource,
                'posts',
                {hash: {filter: 'author:{{post.author}}'}, data: locals, fn: fn, inverse: inverse}
            ).then(function () {
                assert(Array.isArray(browseStub.firstCall.args));
                assert.equal(browseStub.firstCall.args.length, 1);
                const options = browseStub.firstCall.args[0];
                assert(options && typeof options === 'object');
                assert('filter' in options);
                assert.equal(options.filter, 'author:cameron');

                done();
            }).catch(done);
        });

        it('should resolve basic path', function (done) {
            get.call(
                resource,
                'posts',
                {hash: {filter: 'id:-{{post.id}}'}, data: locals, fn: fn, inverse: inverse}
            ).then(function () {
                assert(Array.isArray(browseStub.firstCall.args));
                assert.equal(browseStub.firstCall.args.length, 1);
                const options = browseStub.firstCall.args[0];
                assert(options && typeof options === 'object');
                assert('filter' in options);
                assert.equal(options.filter, 'id:-3');

                done();
            }).catch(done);
        });

        it('should handle arrays the same as handlebars', function (done) {
            get.call(
                resource,
                'posts',
                {hash: {filter: 'tags:{{post.tags.[0].slug}}'}, data: locals, fn: fn, inverse: inverse}
            ).then(function () {
                assert(Array.isArray(browseStub.firstCall.args));
                assert.equal(browseStub.firstCall.args.length, 1);
                const options = browseStub.firstCall.args[0];
                assert(options && typeof options === 'object');
                assert('filter' in options);
                assert.equal(options.filter, 'tags:test');

                done();
            }).catch(done);
        });

        it('should handle dates', function (done) {
            get.call(
                resource,
                'posts',
                {hash: {filter: 'published_at:<=\'{{post.published_at}}\''}, data: locals, fn: fn, inverse: inverse}
            ).then(function () {
                assert(Array.isArray(browseStub.firstCall.args));
                assert.equal(browseStub.firstCall.args.length, 1);
                const options = browseStub.firstCall.args[0];
                assert(options && typeof options === 'object');
                assert('filter' in options);
                assert.equal(options.filter, `published_at:<='${pubDate.toISOString()}'`);

                done();
            }).catch(done);
        });

        it('should output nothing if path does not resolve', function (done) {
            get.call(
                resource,
                'posts',
                {hash: {filter: 'id:{{post.thing}}'}, data: locals, fn: fn, inverse: inverse}
            ).then(function () {
                assert(Array.isArray(browseStub.firstCall.args));
                assert.equal(browseStub.firstCall.args.length, 1);
                const options = browseStub.firstCall.args[0];
                assert(options && typeof options === 'object');
                assert('filter' in options);
                assert.equal(options.filter, 'id:');

                done();
            }).catch(done);
        });

        it('should resolve global props', function (done) {
            get.call(
                resource,
                'posts',
                {hash: {filter: 'slug:{{@globalProp.foo}}'}, data: locals, fn: fn, inverse: inverse}
            ).then(function () {
                assert(Array.isArray(browseStub.firstCall.args));
                assert.equal(browseStub.firstCall.args.length, 1);
                const options = browseStub.firstCall.args[0];
                assert(options && typeof options === 'object');
                assert('filter' in options);
                assert.equal(options.filter, 'slug:bar');

                done();
            }).catch(done);
        });
    });

    describe('querySimplePath', function () {
        const data = {
            post: {
                id: 3,
                title: 'Test',
                author: {slug: 'cameron'},
                tags: [{slug: 'test'}, {slug: 'magic'}],
                published_at: new Date('2024-01-15')
            }
        };

        it('resolves simple dot-notation path', function () {
            assert.deepEqual(querySimplePath(data, 'post.id'), [3]);
        });

        it('resolves nested dot-notation path', function () {
            assert.deepEqual(querySimplePath(data, 'post.author.slug'), ['cameron']);
        });

        it('resolves array wildcard', function () {
            assert.deepEqual(querySimplePath(data, 'post.tags[*].slug'), ['test', 'magic']);
        });

        it('resolves numeric array index', function () {
            assert.deepEqual(querySimplePath(data, 'post.tags[0].slug'), ['test']);
            assert.deepEqual(querySimplePath(data, 'post.tags[1].slug'), ['magic']);
        });

        it('returns empty array for non-existent path', function () {
            assert.deepEqual(querySimplePath(data, 'post.nonexistent'), []);
        });

        it('returns empty array for non-existent nested path', function () {
            assert.deepEqual(querySimplePath(data, 'post.foo.bar.baz'), []);
        });

        it('returns empty array when wildcard applied to non-array', function () {
            assert.deepEqual(querySimplePath(data, 'post.title[*].slug'), []);
        });

        it('returns empty array for out-of-bounds index', function () {
            assert.deepEqual(querySimplePath(data, 'post.tags[5].slug'), []);
        });

        it('handles null in path gracefully', function () {
            assert.deepEqual(querySimplePath({a: null}, 'a.b'), []);
        });

        it('handles Date values', function () {
            const result = querySimplePath(data, 'post.published_at');
            assert.equal(result.length, 1);
            assert(result[0] instanceof Date);
        });

        it('throws on recursive descent syntax', function () {
            assert.throws(
                () => querySimplePath(data, 'post..tags'),
                {message: /unsupported path segment ""/}
            );
        });

        it('throws on filter expression syntax', function () {
            assert.throws(
                () => querySimplePath(data, 'post.tags[?(@.slug)]'),
                {message: /unsupported path segment "tags\[\?\(@"/}
            );
        });

        it('throws on unclosed bracket', function () {
            assert.throws(
                () => querySimplePath(data, 'post.tags[0'),
                {message: /unsupported path segment "tags\[0"/}
            );
        });

        it('throws on non-numeric bracket content', function () {
            assert.throws(
                () => querySimplePath(data, 'post.tags[foo]'),
                {message: /unsupported path segment "tags\[foo\]"/}
            );
        });
    });

    describe('limit capping', function () {
        let browseStub;

        beforeEach(function () {
            browseStub = sinon.stub().resolves();

            sinon.stub(api, 'postsPublic').get(() => {
                return {
                    browse: browseStub
                };
            });
        });

        it('caps "all" to maxLimit (100 by default)', async function () {
            locals = {root: {_locals: {}}};
            await get.call(
                {},
                'posts',
                {hash: {limit: 'all'}, data: locals, fn: fn, inverse: inverse}
            );
            assert.equal(browseStub.firstCall.args[0].limit, 100);
        });

        it('allows "all" when allowLimitAll is true', async function () {
            sinon.stub(maxLimitCap.limitConfig, 'allowLimitAll').value(true);

            locals = {root: {_locals: {}}};
            await get.call(
                {},
                'posts',
                {hash: {limit: 'all'}, data: locals, fn: fn, inverse: inverse}
            );
            assert.equal(browseStub.firstCall.args[0].limit, 'all');
        });

        it('caps numeric limits exceeding maxLimit', async function () {
            locals = {root: {_locals: {}}};
            await get.call(
                {},
                'posts',
                {hash: {limit: 150}, data: locals, fn: fn, inverse: inverse}
            );
            assert.equal(browseStub.firstCall.args[0].limit, 100);
        });

        it('leaves numeric limits below maxLimit unchanged', async function () {
            locals = {root: {_locals: {}}};
            await get.call(
                {},
                'posts',
                {hash: {limit: 50}, data: locals, fn: fn, inverse: inverse}
            );
            assert.equal(browseStub.firstCall.args[0].limit, 50);
        });

        it('uses custom maxLimit when configured', async function () {
            sinon.stub(maxLimitCap.limitConfig, 'maxLimit').value(50);

            locals = {root: {_locals: {}}};
            await get.call(
                {},
                'posts',
                {hash: {limit: 'all'}, data: locals, fn: fn, inverse: inverse}
            );
            assert.equal(browseStub.firstCall.args[0].limit, 50);
        });

        it('caps invalid string limits to maxLimit', async function () {
            locals = {root: {_locals: {}}};
            await get.call(
                {},
                'posts',
                {hash: {limit: 'invalid'}, data: locals, fn: fn, inverse: inverse}
            );
            assert.equal(browseStub.firstCall.args[0].limit, 100);
        });
    });

    describe('auth', function () {
        /**
         * @type sinon.SinonStub<any[], any>
         */
        let browseStub;
        let member;

        beforeEach(function () {
            browseStub = sinon.stub().resolves();
            member = {uuid: 'test'};

            sinon.stub(api, 'postsPublic').get(() => {
                return {
                    browse: browseStub
                };
            });
        });

        it('should pass the member context', async function () {
            locals = {root: {_locals: {}}, member};
            await get.call(
                {},
                'posts',
                {hash: {}, data: locals, fn: fn, inverse: inverse}
            );
            assert.equal(browseStub.firstCall.args[0].context.member, member);
        });
    });

    describe('optimization', function () {
        beforeEach(function () {
            sinon.stub(api, 'postsPublic').get(() => {
                return {
                    browse: () => {
                        return new Promise((resolve) => {
                            setTimeout(() => {
                                resolve({posts: [{id: 'abcd1234'}]});
                            }, 5);
                        });
                    }
                };
            });
        });
        afterEach(async function () {
            await configUtils.restore();
        });

        it('should log a warning if it hits the notify threshold', async function () {
            configUtils.set('optimization:getHelper:notify:threshold', 1);

            await get.call(
                {},
                'posts',
                {hash: {}, data: locals, fn: fn, inverse: inverse}
            );

            // A log message will be output
            sinon.assert.calledOnce(logging.warn);
            // The get helper will return as per usual
            sinon.assert.calledOnce(fn);
            const args = fn.firstCall.args[0];
            assert(args && typeof args === 'object');
            assert('posts' in args);
            assert(Array.isArray(args.posts));
            assert.equal(args.posts.length, 1);
        });

        it('should log an error and return safely if it hits the timeout threshold', async function () {
            configUtils.set('optimization:getHelper:timeout:threshold', 1);

            const result = await get.call(
                {},
                'posts',
                {hash: {}, data: locals, fn: fn, inverse: inverse}
            );

            assert(result.toString().includes('data-aborted-get-helper'));
            // A log message will be output
            sinon.assert.calledOnce(logging.error);
            // The get helper gets called with an empty array of results
            sinon.assert.calledOnce(fn);
            const args = fn.firstCall.args[0];
            assert(args && typeof args === 'object');
            assert('posts' in args);
            assert.deepEqual(args.posts, []);
        });
    });

    describe('per-request deduplication', function () {
        let browseStub;
        const meta = {pagination: {}};

        beforeEach(function () {
            browseStub = sinon.stub().resolves({posts: [{id: 'post1', title: 'Test Post'}], meta: meta});
            sinon.stub(api, 'postsPublic').get(() => {
                return {
                    browse: browseStub
                };
            });
        });

        afterEach(async function () {
            await configUtils.restore();
        });

        it('should make duplicate API calls when deduplication is disabled', async function () {
            // Deduplication disabled by default
            locals = {root: {_locals: {}}};

            // First call
            await get.call(
                {},
                'posts',
                {hash: {filter: 'featured:true'}, data: locals, fn: fn, inverse: inverse}
            );

            // Second call with same query
            await get.call(
                {},
                'posts',
                {hash: {filter: 'featured:true'}, data: locals, fn: fn, inverse: inverse}
            );

            // Should make two API calls since deduplication is disabled
            sinon.assert.calledTwice(browseStub);
        });

        it('should deduplicate identical queries when enabled', async function () {
            configUtils.set('optimization:getHelper:deduplication', true);
            locals = {root: {_locals: {}}, _queryCache: new Map()};

            // First call
            await get.call(
                {},
                'posts',
                {hash: {filter: 'featured:true'}, data: locals, fn: fn, inverse: inverse}
            );

            // Second call with same query
            await get.call(
                {},
                'posts',
                {hash: {filter: 'featured:true'}, data: locals, fn: fn, inverse: inverse}
            );

            // Should only make one API call
            sinon.assert.calledOnce(browseStub);
            // But both calls should have rendered
            sinon.assert.calledTwice(fn);
        });

        it('should make separate API calls for different queries when enabled', async function () {
            configUtils.set('optimization:getHelper:deduplication', true);
            locals = {root: {_locals: {}}, _queryCache: new Map()};

            // First call
            await get.call(
                {},
                'posts',
                {hash: {filter: 'featured:true'}, data: locals, fn: fn, inverse: inverse}
            );

            // Second call with different filter
            await get.call(
                {},
                'posts',
                {hash: {filter: 'featured:false'}, data: locals, fn: fn, inverse: inverse}
            );

            // Should make two API calls for different queries
            sinon.assert.calledTwice(browseStub);
        });

        it('should include member uuid in cache key', async function () {
            configUtils.set('optimization:getHelper:deduplication', true);

            // Call with member A
            const localsA = {root: {_locals: {}}, _queryCache: new Map(), member: {uuid: 'member-a'}};
            await get.call(
                {},
                'posts',
                {hash: {filter: 'featured:true'}, data: localsA, fn: fn, inverse: inverse}
            );

            // Call with member B (same query but different member)
            const localsB = {root: {_locals: {}}, _queryCache: localsA._queryCache, member: {uuid: 'member-b'}};
            await get.call(
                {},
                'posts',
                {hash: {filter: 'featured:true'}, data: localsB, fn: fn, inverse: inverse}
            );

            // Should make two API calls because member context is different
            sinon.assert.calledTwice(browseStub);
        });

        it('should not cache failed API requests', async function () {
            configUtils.set('optimization:getHelper:deduplication', true);
            locals = {root: {_locals: {}}, _queryCache: new Map()};

            // Set up stub to fail first, then succeed
            browseStub.onFirstCall().rejects(new Error('API Error'));
            browseStub.onSecondCall().resolves({posts: [{id: 'post1'}], meta: meta});

            // First call - should fail
            await get.call(
                {},
                'posts',
                {hash: {filter: 'featured:true'}, data: locals, fn: fn, inverse: inverse}
            );

            // Second call with same query - should retry since first failed
            await get.call(
                {},
                'posts',
                {hash: {filter: 'featured:true'}, data: locals, fn: fn, inverse: inverse}
            );

            // Should make two API calls because first one failed
            sinon.assert.calledTwice(browseStub);
        });

        it('should work without _queryCache in data', async function () {
            configUtils.set('optimization:getHelper:deduplication', true);
            // No _queryCache in locals
            locals = {root: {_locals: {}}};

            // Should not throw and should make API call
            await get.call(
                {},
                'posts',
                {hash: {filter: 'featured:true'}, data: locals, fn: fn, inverse: inverse}
            );

            sinon.assert.calledOnce(browseStub);
            sinon.assert.calledOnce(fn);
        });

        it('should deduplicate queries with same parameters in different order', async function () {
            configUtils.set('optimization:getHelper:deduplication', true);
            locals = {root: {_locals: {}}, _queryCache: new Map()};

            // First call
            await get.call(
                {},
                'posts',
                {hash: {filter: 'featured:true', limit: 5}, data: locals, fn: fn, inverse: inverse}
            );

            // Second call with equivalent params in different insertion order
            await get.call(
                {},
                'posts',
                {hash: {limit: 5, filter: 'featured:true'}, data: locals, fn: fn, inverse: inverse}
            );

            // Should only make one API call
            sinon.assert.calledOnce(browseStub);
        });

        it('should handle concurrent identical requests', async function () {
            configUtils.set('optimization:getHelper:deduplication', true);
            locals = {root: {_locals: {}}, _queryCache: new Map()};

            let resolveBrowse;
            browseStub.callsFake(() => {
                return new Promise((resolve) => {
                    resolveBrowse = resolve;
                });
            });

            const firstCall = get.call(
                {},
                'posts',
                {hash: {filter: 'featured:true'}, data: locals, fn: fn, inverse: inverse}
            );
            const secondCall = get.call(
                {},
                'posts',
                {hash: {filter: 'featured:true'}, data: locals, fn: fn, inverse: inverse}
            );

            // Verify deduplication while both calls are in-flight.
            sinon.assert.calledOnce(browseStub);
            assert.equal(typeof resolveBrowse, 'function');

            if (!resolveBrowse) {
                throw new Error('Expected browse resolver to be set');
            }
            resolveBrowse({posts: [{id: 'post1'}], meta: meta});
            await Promise.all([firstCall, secondCall]);

            // Should only make one API call even for concurrent requests
            sinon.assert.calledOnce(browseStub);
            // Both should have rendered
            sinon.assert.calledTwice(fn);
        });

        it('should not reuse the same response object instance across renders', async function () {
            configUtils.set('optimization:getHelper:deduplication', true);
            locals = {root: {_locals: {}}, _queryCache: new Map()};

            await get.call(
                {},
                'posts',
                {hash: {filter: 'featured:true'}, data: locals, fn: fn, inverse: inverse}
            );

            await get.call(
                {},
                'posts',
                {hash: {filter: 'featured:true'}, data: locals, fn: fn, inverse: inverse}
            );

            sinon.assert.calledOnce(browseStub);
            assert.notEqual(fn.firstCall.args[0], fn.secondCall.args[0]);
        });
    });
});
