const should = require('should');
const sinon = require('sinon');
const Promise = require('bluebird');
const {SafeString} = require('../../../../core/frontend/services/handlebars');

// Stuff we are testing
const get = require('../../../../core/frontend/helpers/get');
const models = require('../../../../core/server/models');
const proxy = require('../../../../core/frontend/services/proxy');
const api = require('../../../../core/server/api').endpoints;

describe('{{#get}} helper', function () {
    let fn;
    let inverse;
    let locals = {};

    before(function () {
        models.init();
    });

    beforeEach(function () {
        fn = sinon.spy();
        inverse = sinon.spy();

        locals = {root: {}, globalProp: {foo: 'bar'}};
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('context preparation', function () {
        let browsePostsStub;
        const meta = {pagination: {}};

        beforeEach(function () {
            locals = {root: {_locals: {}}};

            browsePostsStub = sinon.stub(api, 'postsPublic').get(() => {
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
                fn.called.should.be.true();
                fn.firstCall.args[0].should.be.an.Object().with.property('posts');

                fn.firstCall.args[0].posts[0].feature_image_caption.should.be.an.instanceOf(SafeString);

                done();
            }).catch(done);
        });
    });

    describe('authors', function () {
        let browseAuthorsStub;
        const meta = {pagination: {}};

        beforeEach(function () {
            locals = {root: {_locals: {}}};

            browseAuthorsStub = sinon.stub(api, 'authorsPublic').get(() => {
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
                fn.called.should.be.true();
                fn.firstCall.args[0].should.be.an.Object().with.property('authors');
                fn.firstCall.args[0].authors.should.eql([]);
                inverse.called.should.be.false();

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
                fn.called.should.be.false();
                inverse.calledOnce.should.be.true();
                inverse.firstCall.args[1].should.be.an.Object().and.have.property('data');
                inverse.firstCall.args[1].data.should.be.an.Object().and.have.property('error');
                inverse.firstCall.args[1].data.error.should.eql('Invalid resource given to get helper');

                done();
            }).catch(done);
        });

        it('should handle error from the API', function (done) {
            get.call(
                {},
                'posts',
                {hash: {slug: 'thing!'}, data: locals, fn: fn, inverse: inverse}
            ).then(function () {
                fn.called.should.be.false();
                inverse.calledOnce.should.be.true();
                inverse.firstCall.args[1].should.be.an.Object().and.have.property('data');
                inverse.firstCall.args[1].data.should.be.an.Object().and.have.property('error');
                inverse.firstCall.args[1].data.error.should.match(/^Validation/);

                done();
            }).catch(done);
        });

        it('should show warning for call without any options', function (done) {
            get.call(
                {},
                'posts',
                {data: locals}
            ).then(function () {
                fn.called.should.be.false();
                inverse.called.should.be.false();

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
                browseStub.firstCall.args[0].filter.should.eql('tags:[test,magic]');

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
                browseStub.firstCall.args[0].filter.should.eql('author:cameron');

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
                browseStub.firstCall.args[0].filter.should.eql('id:-3');

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
                browseStub.firstCall.args[0].filter.should.eql('tags:test');

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
                browseStub.firstCall.args[0].filter.should.eql('id:');

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
                browseStub.firstCall.args[0].filter.should.eql('slug:bar');

                done();
            }).catch(done);
        });
    });

    describe('limit=all max', function () {
        let browseStub;

        beforeEach(function () {
            browseStub = sinon.stub().resolves();

            sinon.stub(api, 'postsPublic').get(() => {
                return {
                    browse: browseStub
                };
            });
        });

        it('Behaves normally without config', async function () {
            locals = {root: {_locals: {}}};
            await get.call(
                {},
                'posts',
                {hash: {limit: 'all'}, data: locals, fn: fn, inverse: inverse}
            );
            browseStub.firstCall.args[0].limit.should.eql('all');
        });

        it('Replaces "all" with "getHelperLimitAllMax" config, if present', async function () {
            sinon.stub(proxy.config, 'get').withArgs('getHelperLimitAllMax').returns(2);

            locals = {root: {_locals: {}}};
            await get.call(
                {},
                'posts',
                {hash: {limit: 'all'}, data: locals, fn: fn, inverse: inverse}
            );
            browseStub.firstCall.args[0].limit.should.eql(2);
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
});
