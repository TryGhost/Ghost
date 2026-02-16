const assert = require('node:assert/strict');
const should = require('should');
const sinon = require('sinon');
const {SafeString} = require('../../../../core/frontend/services/handlebars');
const configUtils = require('../../../utils/config-utils');
const loggingLib = require('@tryghost/logging');

// Stuff we are testing
const get = require('../../../../core/frontend/helpers/get');
const {querySimplePath} = require('../../../../core/frontend/helpers/get');
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
                assert.equal(fn.called, true);
                fn.firstCall.args[0].should.be.an.Object().with.property('posts');

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
                assert.equal(fn.called, true);
                fn.firstCall.args[0].should.be.an.Object().with.property('authors');
                assert.deepEqual(fn.firstCall.args[0].authors, []);
                assert.equal(inverse.called, false);

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
                assert.equal(fn.called, true);
                fn.firstCall.args[0].should.be.an.Object().with.property('newsletters');
                assert.deepEqual(fn.firstCall.args[0].newsletters, []);
                assert.equal(inverse.called, false);

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
                assert.equal(fn.called, false);
                assert.equal(inverse.calledOnce, true);
                inverse.firstCall.args[1].should.be.an.Object().and.have.property('data');
                inverse.firstCall.args[1].data.should.be.an.Object().and.have.property('error');
                assert.equal(inverse.firstCall.args[1].data.error, 'Invalid "magic" resource given to get helper');

                done();
            }).catch(done);
        });

        it('should handle error from the API', function (done) {
            get.call(
                {},
                'posts',
                {hash: {slug: 'thing!'}, data: locals, fn: fn, inverse: inverse}
            ).then(function () {
                assert.equal(fn.called, false);
                assert.equal(inverse.calledOnce, true);
                inverse.firstCall.args[1].should.be.an.Object().and.have.property('data');
                inverse.firstCall.args[1].data.should.be.an.Object().and.have.property('error');
                assert.match(inverse.firstCall.args[1].data.error, /^Validation/);

                done();
            }).catch(done);
        });

        it('should show warning for call without any options', function (done) {
            get.call(
                {},
                'posts',
                {data: locals}
            ).then(function () {
                assert.equal(fn.called, false);
                assert.equal(inverse.called, false);

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
                browseStub.firstCall.args.should.be.an.Array().with.lengthOf(1);
                browseStub.firstCall.args[0].should.be.an.Object().with.property('filter');
                assert.equal(browseStub.firstCall.args[0].filter, 'tags:[test,magic]');

                done();
            }).catch(done);
        });

        it('should resolve post.author alias', function (done) {
            get.call(
                resource,
                'posts',
                {hash: {filter: 'author:{{post.author}}'}, data: locals, fn: fn, inverse: inverse}
            ).then(function () {
                browseStub.firstCall.args.should.be.an.Array().with.lengthOf(1);
                browseStub.firstCall.args[0].should.be.an.Object().with.property('filter');
                assert.equal(browseStub.firstCall.args[0].filter, 'author:cameron');

                done();
            }).catch(done);
        });

        it('should resolve basic path', function (done) {
            get.call(
                resource,
                'posts',
                {hash: {filter: 'id:-{{post.id}}'}, data: locals, fn: fn, inverse: inverse}
            ).then(function () {
                browseStub.firstCall.args.should.be.an.Array().with.lengthOf(1);
                browseStub.firstCall.args[0].should.be.an.Object().with.property('filter');
                assert.equal(browseStub.firstCall.args[0].filter, 'id:-3');

                done();
            }).catch(done);
        });

        it('should handle arrays the same as handlebars', function (done) {
            get.call(
                resource,
                'posts',
                {hash: {filter: 'tags:{{post.tags.[0].slug}}'}, data: locals, fn: fn, inverse: inverse}
            ).then(function () {
                browseStub.firstCall.args.should.be.an.Array().with.lengthOf(1);
                browseStub.firstCall.args[0].should.be.an.Object().with.property('filter');
                assert.equal(browseStub.firstCall.args[0].filter, 'tags:test');

                done();
            }).catch(done);
        });

        it('should handle dates', function (done) {
            get.call(
                resource,
                'posts',
                {hash: {filter: 'published_at:<=\'{{post.published_at}}\''}, data: locals, fn: fn, inverse: inverse}
            ).then(function () {
                browseStub.firstCall.args.should.be.an.Array().with.lengthOf(1);
                browseStub.firstCall.args[0].should.be.an.Object().with.property('filter');
                browseStub.firstCall.args[0].filter.should.eql(`published_at:<='${pubDate.toISOString()}'`);

                done();
            }).catch(done);
        });

        it('should output nothing if path does not resolve', function (done) {
            get.call(
                resource,
                'posts',
                {hash: {filter: 'id:{{post.thing}}'}, data: locals, fn: fn, inverse: inverse}
            ).then(function () {
                browseStub.firstCall.args.should.be.an.Array().with.lengthOf(1);
                browseStub.firstCall.args[0].should.be.an.Object().with.property('filter');
                assert.equal(browseStub.firstCall.args[0].filter, 'id:');

                done();
            }).catch(done);
        });

        it('should resolve global props', function (done) {
            get.call(
                resource,
                'posts',
                {hash: {filter: 'slug:{{@globalProp.foo}}'}, data: locals, fn: fn, inverse: inverse}
            ).then(function () {
                browseStub.firstCall.args.should.be.an.Array().with.lengthOf(1);
                browseStub.firstCall.args[0].should.be.an.Object().with.property('filter');
                assert.equal(browseStub.firstCall.args[0].filter, 'slug:bar');

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
            querySimplePath(data, 'post.id').should.eql([3]);
        });

        it('resolves nested dot-notation path', function () {
            querySimplePath(data, 'post.author.slug').should.eql(['cameron']);
        });

        it('resolves array wildcard', function () {
            querySimplePath(data, 'post.tags[*].slug').should.eql(['test', 'magic']);
        });

        it('resolves numeric array index', function () {
            querySimplePath(data, 'post.tags[0].slug').should.eql(['test']);
            querySimplePath(data, 'post.tags[1].slug').should.eql(['magic']);
        });

        it('returns empty array for non-existent path', function () {
            querySimplePath(data, 'post.nonexistent').should.eql([]);
        });

        it('returns empty array for non-existent nested path', function () {
            querySimplePath(data, 'post.foo.bar.baz').should.eql([]);
        });

        it('returns empty array when wildcard applied to non-array', function () {
            querySimplePath(data, 'post.title[*].slug').should.eql([]);
        });

        it('returns empty array for out-of-bounds index', function () {
            querySimplePath(data, 'post.tags[5].slug').should.eql([]);
        });

        it('handles null in path gracefully', function () {
            querySimplePath({a: null}, 'a.b').should.eql([]);
        });

        it('handles Date values', function () {
            const result = querySimplePath(data, 'post.published_at');
            result.should.have.length(1);
            result[0].should.be.a.Date();
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
            browseStub.firstCall.args[0].context.member.should.eql(member);
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
            assert.equal(logging.warn.calledOnce, true);
            // The get helper will return as per usual
            assert.equal(fn.calledOnce, true);
            fn.firstCall.args[0].should.be.an.Object().with.property('posts');
            fn.firstCall.args[0].posts.should.be.an.Array().with.lengthOf(1);
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
            assert.equal(logging.error.calledOnce, true);
            // The get helper gets called with an empty array of results
            assert.equal(fn.calledOnce, true);
            fn.firstCall.args[0].should.be.an.Object().with.property('posts');
            fn.firstCall.args[0].posts.should.be.an.Array().with.lengthOf(0);
        });
    });
});
