/*globals describe, before, beforeEach, afterEach, it*/
var should         = require('should'),
    sinon          = require('sinon'),
    hbs            = require('express-hbs'),
    Promise        = require('bluebird'),
    utils          = require('./utils'),

// Stuff we are testing
    handlebars     = hbs.handlebars,
    helpers        = require('../../../server/helpers'),
    api            = require('../../../server/api'),

    labs           = require('../../../server/utils/labs'),

    sandbox = sinon.sandbox.create();

describe('{{#get}} helper', function () {
    var fn, inverse;

    before(function () {
        utils.loadHelpers();
    });

    beforeEach(function () {
        fn = sandbox.spy();
        inverse = sandbox.spy();
        sandbox.stub(labs, 'isSet').returns(true);
    });

    afterEach(function () {
        sandbox.restore();
    });

    it('has loaded get block helper', function () {
        should.exist(handlebars.helpers.get);
    });

    describe('posts', function () {
        var browsePostsStub, readPostsStub, readTagsStub, readUsersStub, testPostsArr = [
            {id: 1, title: 'Test Post 1', author: {slug: 'cameron'}},
            {id: 2, title: 'Test Post 2', author: {slug: 'cameron'}, featured: true},
            {id: 3, title: 'Test Post 3', tags: [{slug: 'test'}]},
            {id: 4, title: 'Test Post 4'}
        ],
            meta = {pagination: {}};
        beforeEach(function () {
            browsePostsStub = sandbox.stub(api.posts, 'browse');
            readPostsStub = sandbox.stub(api.posts, 'read');
            readTagsStub = sandbox.stub(api.tags, 'read').returns(new Promise.resolve({tags: []}));
            readUsersStub = sandbox.stub(api.users, 'read').returns(new Promise.resolve({users: []}));

            browsePostsStub.returns(new Promise.resolve({posts: testPostsArr, meta: meta}));
            browsePostsStub.withArgs({limit: '3'}).returns(new Promise.resolve({posts: testPostsArr.slice(0, 3), meta: meta}));
            browsePostsStub.withArgs({limit: '1'}).returns(new Promise.resolve({posts: testPostsArr.slice(0, 1)}));
            browsePostsStub.withArgs({filter: 'tags:test'}).returns(new Promise.resolve({posts: testPostsArr.slice(2, 3)}));
            browsePostsStub.withArgs({filter: 'tags:none'}).returns(new Promise.resolve({posts: []}));
            browsePostsStub.withArgs({filter: 'author:cameron'}).returns(new Promise.resolve({posts: testPostsArr.slice(0, 2)}));
            browsePostsStub.withArgs({filter: 'featured:true'}).returns(new Promise.resolve({posts: testPostsArr.slice(2, 3)}));
            readPostsStub.withArgs({id: '2'}).returns(new Promise.resolve({posts: testPostsArr.slice(1, 2)}));
        });

        it('should handle default browse posts call', function (done) {
            helpers.get.call(
                {},
                'posts',
                {hash: {}, fn: fn, inverse: inverse}
            ).then(function () {
                fn.called.should.be.true();
                fn.firstCall.args[0].should.be.an.Object().with.property('posts');
                fn.firstCall.args[0].posts.should.eql(testPostsArr);
                fn.firstCall.args[0].posts.should.have.lengthOf(4);
                inverse.called.should.be.false();

                done();
            }).catch(done);
        });

        it('should return pagination and meta pagination with default browse posts call', function (done) {
            helpers.get.call(
                {},
                'posts',
                {hash: {}, fn: fn, inverse: inverse}
            ).then(function () {
                fn.firstCall.args[0].pagination.should.be.an.Object();
                fn.firstCall.args[0].meta.should.be.an.Object();
                fn.firstCall.args[0].meta.pagination.should.be.an.Object();
                inverse.called.should.be.false();

                done();
            }).catch(done);
        });

        it('should not return pagination if meta pagination does not exist', function (done) {
            helpers.get.call(
                {},
                'posts',
                {hash: {limit: '1'}, fn: fn, inverse: inverse}
            ).then(function () {
                should.not.exist(fn.firstCall.args[0].pagination);
                should.not.exist(fn.firstCall.args[0].meta);
                inverse.called.should.be.false();

                done();
            }).catch(done);
        });

        it('should handle browse posts call with limit 3', function (done) {
            helpers.get.call(
                {},
                'posts',
                {hash: {limit: '3'}, fn: fn, inverse: inverse}
            ).then(function () {
                    fn.calledOnce.should.be.true();
                    fn.firstCall.args[0].should.be.an.Object().with.property('posts');
                    fn.firstCall.args[0].posts.should.have.lengthOf(3);
                    fn.firstCall.args[0].posts.should.eql(testPostsArr.slice(0, 3));
                    inverse.called.should.be.false();

                    done();
                }).catch(done);
        });

        it('should handle browse posts call with limit 1', function (done) {
            helpers.get.call(
                {},
                'posts',
                {hash: {limit: '1'}, fn: fn, inverse: inverse}
            ).then(function () {
                    fn.calledOnce.should.be.true();
                    fn.firstCall.args[0].should.be.an.Object().with.property('posts');
                    fn.firstCall.args[0].posts.should.have.lengthOf(1);
                    fn.firstCall.args[0].posts.should.eql(testPostsArr.slice(0, 1));
                    inverse.called.should.be.false();

                    done();
                }).catch(done);
        });

        it('should handle browse posts call with limit 1', function (done) {
            helpers.get.call(
                {},
                'posts',
                {hash: {limit: '1'}, fn: fn, inverse: inverse}
            ).then(function () {
                    fn.calledOnce.should.be.true();
                    fn.firstCall.args[0].should.be.an.Object().with.property('posts');
                    fn.firstCall.args[0].posts.should.have.lengthOf(1);
                    fn.firstCall.args[0].posts.should.eql(testPostsArr.slice(0, 1));
                    inverse.called.should.be.false();

                    done();
                }).catch(done);
        });

        it('should handle browse post call with explicit tag', function (done) {
            helpers.get.call(
                {},
                'posts',
                {hash: {filter: 'tags:test'}, fn: fn, inverse: inverse}
            ).then(function () {
                fn.calledOnce.should.be.true();
                fn.firstCall.args[0].should.be.an.Object().with.property('posts');
                fn.firstCall.args[0].posts.should.have.lengthOf(1);
                fn.firstCall.args[0].posts.should.eql(testPostsArr.slice(2, 3));
                inverse.called.should.be.false();
                done();
            }).catch(done);
        });

        it('should handle browse post call with explicit author', function (done) {
            helpers.get.call(
                {},
                'posts',
                {hash: {filter: 'author:cameron'}, fn: fn, inverse: inverse}
            ).then(function () {
                fn.calledOnce.should.be.true();
                fn.firstCall.args[0].should.be.an.Object().with.property('posts');
                fn.firstCall.args[0].posts.should.have.lengthOf(2);
                fn.firstCall.args[0].posts.should.eql(testPostsArr.slice(0, 2));
                inverse.called.should.be.false();
                done();
            }).catch(done);
        });

        it('should handle browse post call with featured:true', function (done) {
            helpers.get.call(
                {},
                'posts',
                {hash: {filter: 'featured:true'}, fn: fn, inverse: inverse}
            ).then(function () {
                fn.calledOnce.should.be.true();
                fn.firstCall.args[0].should.be.an.Object().with.property('posts');
                fn.firstCall.args[0].posts.should.have.lengthOf(1);
                fn.firstCall.args[0].posts.should.eql(testPostsArr.slice(2, 3));
                inverse.called.should.be.false();
                done();
            }).catch(done);
        });

        it('should handle read post by id call', function (done) {
            helpers.get.call(
                {},
                'posts',
                {hash: {id: '2'}, fn: fn, inverse: inverse}
            ).then(function () {
                fn.calledOnce.should.be.true();
                fn.firstCall.args[0].should.be.an.Object().with.property('posts');
                fn.firstCall.args[0].posts.should.have.lengthOf(1);
                fn.firstCall.args[0].posts.should.eql(testPostsArr.slice(1, 2));
                inverse.called.should.be.false();

                done();
            }).catch(done);
        });

        it('should handle empty result set', function (done) {
            helpers.get.call(
                {},
                'posts',
                {hash: {filter: 'tags:none'}, fn: fn, inverse: inverse}
            ).then(function () {
                fn.called.should.be.false();
                inverse.calledOnce.should.be.true();
                inverse.firstCall.args[1].should.be.an.Object().and.have.property('data');
                inverse.firstCall.args[1].data.should.be.an.Object().and.not.have.property('error');

                done();
            }).catch(done);
        });
    });

    describe('general error handling', function () {
        it('should return an error for an unknown resource', function (done) {
            helpers.get.call(
                {},
                'magic',
                {hash: {}, fn: fn, inverse: inverse}
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
            helpers.get.call(
                {},
                'posts',
                {hash: {status: 'thing!'}, fn: fn, inverse: inverse}
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
            helpers.get.call(
                {},
                'posts'
            ).then(function () {
                fn.called.should.be.false();
                inverse.called.should.be.false();

                done();
            }).catch(done);
        });
    });

    describe('path resolution', function () {
        var browseStub, readStub, data = {
            post: {id: 3, title: 'Test 3', author: {slug: 'cameron'}, tags: [{slug: 'test'}, {slug: 'magic'}]}
        };

        beforeEach(function () {
            browseStub = sandbox.stub(api.posts, 'browse').returns(new Promise.resolve());
            readStub = sandbox.stub(api.posts, 'read').returns(new Promise.resolve());
        });

        it('should resolve post.tags alias', function (done) {
            helpers.get.call(
                data,
                'posts',
                {hash: {filter: 'tags:[{{post.tags}}]'}, fn: fn, inverse: inverse}
            ).then(function () {
                browseStub.firstCall.args.should.be.an.Array().with.lengthOf(1);
                browseStub.firstCall.args[0].should.be.an.Object().with.property('filter');
                browseStub.firstCall.args[0].filter.should.eql('tags:[test,magic]');

                done();
            }).catch(done);
        });

        it('should resolve post.author alias', function (done) {
            helpers.get.call(
                data,
                'posts',
                {hash: {filter: 'author:{{post.author}}'}, fn: fn, inverse: inverse}
            ).then(function () {
                browseStub.firstCall.args.should.be.an.Array().with.lengthOf(1);
                browseStub.firstCall.args[0].should.be.an.Object().with.property('filter');
                browseStub.firstCall.args[0].filter.should.eql('author:cameron');

                done();
            }).catch(done);
        });

        it('should resolve basic path', function (done) {
            helpers.get.call(
                data,
                'posts',
                {hash: {filter: 'id:-{{post.id}}'}, fn: fn, inverse: inverse}
            ).then(function () {
                    browseStub.firstCall.args.should.be.an.Array().with.lengthOf(1);
                    browseStub.firstCall.args[0].should.be.an.Object().with.property('filter');
                    browseStub.firstCall.args[0].filter.should.eql('id:-3');

                    done();
                }).catch(done);
        });

        it('should handle arrays the same as handlebars', function (done) {
            var tpl = handlebars.compile('{{post.tags.[0].slug}}'),
                output = tpl(data);

            helpers.get.call(
                data,
                'posts',
                {hash: {filter: 'tags:{{post.tags.[0].slug}}'}, fn: fn, inverse: inverse}
            ).then(function () {
                browseStub.firstCall.args.should.be.an.Array().with.lengthOf(1);
                browseStub.firstCall.args[0].should.be.an.Object().with.property('filter');
                browseStub.firstCall.args[0].filter.should.eql('tags:' + output);

                done();
            }).catch(done);
        });

        it('should output nothing if path does not resolve', function (done) {
            helpers.get.call(
                data,
                'posts',
                {hash: {filter: 'id:{{post.thing}}'}, fn: fn, inverse: inverse}
            ).then(function () {
                    browseStub.firstCall.args.should.be.an.Array().with.lengthOf(1);
                    browseStub.firstCall.args[0].should.be.an.Object().with.property('filter');
                    browseStub.firstCall.args[0].filter.should.eql('id:');

                    done();
                }).catch(done);
        });
    });
});
