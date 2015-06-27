/*globals describe, before, beforeEach, afterEach, it*/
/*jshint expr:true*/
var should         = require('should'),
    sinon          = require('sinon'),
    hbs            = require('express-hbs'),
    Promise        = require('bluebird'),
    utils          = require('./utils'),

// Stuff we are testing
    handlebars     = hbs.handlebars,
    helpers        = require('../../../server/helpers'),
    api            = require('../../../server/api');

describe('{{#get}} helper', function () {
    var sandbox;

    before(function () {
        utils.loadHelpers();
    });

    beforeEach(function () {
        sandbox = sinon.sandbox.create();
    });

    afterEach(function () {
        sandbox.restore();
    });

    it('has loaded get block helper', function () {
        should.exist(handlebars.helpers.get);
    });

    describe('posts', function () {
        var testPostsArr = [
            {id: 1, title: 'Test Post 1', author: 'cameron'},
            {id: 2, title: 'Test Post 2', author: 'cameron', featured: true},
            {id: 3, title: 'Test Post 3', tags: [{slug: 'test'}]},
            {id: 4, title: 'Test Post 4'}
        ];
        beforeEach(function () {
            var browseStub = sandbox.stub(api.posts, 'browse'),
                readStub = sandbox.stub(api.posts, 'read');

            browseStub.returns(new Promise.resolve({posts: testPostsArr}));
            browseStub.withArgs({limit: '3'}).returns(new Promise.resolve({posts: testPostsArr.slice(0, 3)}));
            browseStub.withArgs({limit: '1'}).returns(new Promise.resolve({posts: testPostsArr.slice(0, 1)}));
            browseStub.withArgs({tag: 'test'}).returns(new Promise.resolve({posts: testPostsArr.slice(2, 3)}));
            browseStub.withArgs({tag: 'none'}).returns(new Promise.resolve({posts: []}));
            browseStub.withArgs({author: 'cameron'}).returns(new Promise.resolve({posts: testPostsArr.slice(0, 2)}));
            browseStub.withArgs({featured: 'true'}).returns(new Promise.resolve({posts: testPostsArr.slice(2, 3)}));
            readStub.withArgs({id: '2'}).returns(new Promise.resolve({posts: testPostsArr.slice(1, 2)}));
        });

        it('should handle default browse posts call', function (done) {
            var fn = sinon.spy(),
                inverse = sinon.spy();

            helpers.get.call(
                {},
                'posts',
                {hash: {}, fn: fn, inverse: inverse}
            ).then(function () {
                fn.called.should.be.true;
                fn.firstCall.args[0].should.be.an.Object.with.property('posts');
                fn.firstCall.args[0].posts.should.eql(testPostsArr);
                fn.firstCall.args[0].posts.should.have.lengthOf(4);
                inverse.called.should.be.false;

                done();
            }).catch(done);
        });

        it('should handle browse posts call with limit 3', function (done) {
            var fn = sinon.spy(),
                inverse = sinon.spy();

            helpers.get.call(
                {},
                'posts',
                {hash: {limit: '3'}, fn: fn, inverse: inverse}
            ).then(function () {
                    fn.calledOnce.should.be.true;
                    fn.firstCall.args[0].should.be.an.Object.with.property('posts');
                    fn.firstCall.args[0].posts.should.have.lengthOf(3);
                    fn.firstCall.args[0].posts.should.eql(testPostsArr.slice(0, 3));
                    inverse.called.should.be.false;

                    done();
                }).catch(done);
        });

        it('should handle browse posts call with limit 1', function (done) {
            var fn = sinon.spy(),
                inverse = sinon.spy();

            helpers.get.call(
                {},
                'posts',
                {hash: {limit: '1'}, fn: fn, inverse: inverse}
            ).then(function () {
                    fn.calledOnce.should.be.true;
                    fn.firstCall.args[0].should.be.an.Object.with.property('posts');
                    fn.firstCall.args[0].posts.should.have.lengthOf(1);
                    fn.firstCall.args[0].posts.should.eql(testPostsArr.slice(0, 1));
                    inverse.called.should.be.false;

                    done();
                }).catch(done);
        });

        it('should handle browse posts call with limit 1', function (done) {
            var fn = sinon.spy(),
                inverse = sinon.spy();

            helpers.get.call(
                {},
                'posts',
                {hash: {limit: '1'}, fn: fn, inverse: inverse}
            ).then(function () {
                    fn.calledOnce.should.be.true;
                    fn.firstCall.args[0].should.be.an.Object.with.property('posts');
                    fn.firstCall.args[0].posts.should.have.lengthOf(1);
                    fn.firstCall.args[0].posts.should.eql(testPostsArr.slice(0, 1));
                    inverse.called.should.be.false;

                    done();
                }).catch(done);
        });

        it('should handle browse post call with explicit tag', function (done) {
            var fn = sinon.spy(),
                inverse = sinon.spy();

            helpers.get.call(
                {},
                'posts',
                {hash: {tag: 'test'}, fn: fn, inverse: inverse}
            ).then(function () {
                fn.calledOnce.should.be.true;
                fn.firstCall.args[0].should.be.an.Object.with.property('posts');
                fn.firstCall.args[0].posts.should.have.lengthOf(1);
                fn.firstCall.args[0].posts.should.eql(testPostsArr.slice(2, 3));
                inverse.called.should.be.false;
                done();
            }).catch(done);
        });

        it('should handle browse post call with relative tag', function (done) {
            var fn = sinon.spy(),
                inverse = sinon.spy();

            helpers.get.call(
                {},
                'posts',
                {hash: {tag: [{slug: 'test'}]}, fn: fn, inverse: inverse}
            ).then(function () {
                fn.calledOnce.should.be.true;
                fn.firstCall.args[0].should.be.an.Object.with.property('posts');
                fn.firstCall.args[0].posts.should.have.lengthOf(1);
                fn.firstCall.args[0].posts.should.eql(testPostsArr.slice(2, 3));
                inverse.called.should.be.false;
                done();
            }).catch(done);
        });

        it('should handle browse post call with explicit author', function (done) {
            var fn = sinon.spy(),
                inverse = sinon.spy();

            helpers.get.call(
                {},
                'posts',
                {hash: {author: 'cameron'}, fn: fn, inverse: inverse}
            ).then(function () {
                fn.calledOnce.should.be.true;
                fn.firstCall.args[0].should.be.an.Object.with.property('posts');
                fn.firstCall.args[0].posts.should.have.lengthOf(2);
                fn.firstCall.args[0].posts.should.eql(testPostsArr.slice(0, 2));
                inverse.called.should.be.false;
                done();
            }).catch(done);
        });

        it('should handle browse post call with relative author', function (done) {
            var fn = sinon.spy(),
                inverse = sinon.spy();

            helpers.get.call(
                {},
                'posts',
                {hash: {author: {slug: 'cameron'}}, fn: fn, inverse: inverse}
            ).then(function () {
                fn.calledOnce.should.be.true;
                fn.firstCall.args[0].should.be.an.Object.with.property('posts');
                fn.firstCall.args[0].posts.should.have.lengthOf(2);
                fn.firstCall.args[0].posts.should.eql(testPostsArr.slice(0, 2));
                inverse.called.should.be.false;
                done();
            }).catch(done);
        });

        it('should handle browse post call with featured:true', function (done) {
            var fn = sinon.spy(),
                inverse = sinon.spy();

            helpers.get.call(
                {},
                'posts',
                {hash: {featured: 'true'}, fn: fn, inverse: inverse}
            ).then(function () {
                fn.calledOnce.should.be.true;
                fn.firstCall.args[0].should.be.an.Object.with.property('posts');
                fn.firstCall.args[0].posts.should.have.lengthOf(1);
                fn.firstCall.args[0].posts.should.eql(testPostsArr.slice(2, 3));
                inverse.called.should.be.false;
                done();
            }).catch(done);
        });

        it('should handle read post by id call', function (done) {
            var fn = sinon.spy(),
                inverse = sinon.spy();

            helpers.get.call(
                {},
                'posts',
                {hash: {id: '2'}, fn: fn, inverse: inverse}
            ).then(function () {
                fn.calledOnce.should.be.true;
                fn.firstCall.args[0].should.be.an.Object.with.property('posts');
                fn.firstCall.args[0].posts.should.have.lengthOf(1);
                fn.firstCall.args[0].posts.should.eql(testPostsArr.slice(1, 2));
                inverse.called.should.be.false;

                done();
            }).catch(done);
        });

        it('should handle empty result set', function (done) {
            var fn = sinon.spy(),
                inverse = sinon.spy();

            helpers.get.call(
                {},
                'posts',
                {hash: {tag: 'none'}, fn: fn, inverse: inverse}
            ).then(function () {
                fn.called.should.be.false;
                inverse.calledOnce.should.be.true;
                inverse.firstCall.args[1].should.be.an.Object.and.have.property('data');
                inverse.firstCall.args[1].data.should.be.an.Object.and.not.have.property('error');

                done();
            }).catch(done);
        });
    });

    describe('general error handling', function () {
        it('should return an error for an unknown resource', function (done) {
            var fn = sinon.spy(),
                inverse = sinon.spy();

            helpers.get.call(
                {},
                'magic',
                {hash: {}, fn: fn, inverse: inverse}
            ).then(function () {
                fn.called.should.be.false;
                inverse.calledOnce.should.be.true;
                inverse.firstCall.args[1].should.be.an.Object.and.have.property('data');
                inverse.firstCall.args[1].data.should.be.an.Object.and.have.property('error');
                inverse.firstCall.args[1].data.error.should.eql('Invalid resource given to get helper');

                done();
            }).catch(done);
        });

        it('should handle error from the API', function (done) {
            var fn = sinon.spy(),
                inverse = sinon.spy();

            helpers.get.call(
                {},
                'posts',
                {hash: {tag: 'thing!'}, fn: fn, inverse: inverse}
            ).then(function () {
                fn.called.should.be.false;
                inverse.calledOnce.should.be.true;
                inverse.firstCall.args[1].should.be.an.Object.and.have.property('data');
                inverse.firstCall.args[1].data.should.be.an.Object.and.have.property('error');
                inverse.firstCall.args[1].data.error.should.match(/^Validation/);

                done();
            }).catch(done);
        });

        it('should show warning for call without any options', function (done) {
            var fn = sinon.spy(),
                inverse = sinon.spy();

            helpers.get.call(
                {},
                'posts'
            ).then(function () {
                fn.called.should.be.false;
                inverse.called.should.be.false;

                done();
            }).catch(done);
        });
    });
});
