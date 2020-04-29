const should = require('should');
const sinon = require('sinon');
const Promise = require('bluebird');

// Stuff we are testing
const helpers = require('../../../core/frontend/helpers');

const models = require('../../../core/server/models');
const api = require('../../../core/server/api');

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

        locals = {root: {_locals: {apiVersion: 'v2'}}, globalProp: {foo: 'bar'}};
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('authors v2', function () {
        let browseAuthorsStub;
        const meta = {pagination: {}};

        beforeEach(function () {
            locals = {root: {_locals: {apiVersion: 'v2'}}};

            browseAuthorsStub = sinon.stub(api.v2, 'authorsPublic').get(() => {
                return {
                    browse: sinon.stub().resolves({authors: [], meta: meta})
                };
            });
        });

        it('browse authors', function (done) {
            helpers.get.call(
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

    describe('authors canary', function () {
        let browseAuthorsStub;
        const meta = {pagination: {}};

        beforeEach(function () {
            locals = {root: {_locals: {apiVersion: 'canary'}}};

            browseAuthorsStub = sinon.stub(api.canary, 'authorsPublic').get(() => {
                return {
                    browse: sinon.stub().resolves({authors: [], meta: meta})
                };
            });
        });

        it('browse authors', function (done) {
            helpers.get.call(
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

    describe('authors v3', function () {
        let browseAuthorsStub;
        const meta = {pagination: {}};

        beforeEach(function () {
            locals = {root: {_locals: {apiVersion: 'v3'}}};

            browseAuthorsStub = sinon.stub(api.v3, 'authorsPublic').get(() => {
                return {
                    browse: sinon.stub().resolves({authors: [], meta: meta})
                };
            });
        });

        it('browse authors', function (done) {
            helpers.get.call(
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
            helpers.get.call(
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
            helpers.get.call(
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
            helpers.get.call(
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
            sinon.stub(api.v2, 'postsPublic').get(() => {
                return {
                    browse: browseStub,
                    read: readStub
                };
            });
        });

        it('should resolve post.tags alias', function (done) {
            helpers.get.call(
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
            helpers.get.call(
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
            helpers.get.call(
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
            helpers.get.call(
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
            helpers.get.call(
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
            helpers.get.call(
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
            helpers.get.call(
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
});
