/*globals describe, beforeEach, afterEach, it*/
/*jshint expr:true*/
var should         = require('should'),
    sinon          = require('sinon'),
    Promise        = require('bluebird'),
    hbs            = require('express-hbs'),
    utils          = require('./utils'),

// Stuff we are testing
    handlebars     = hbs.handlebars,
    helpers        = require('../../../server/helpers'),
    api            = require('../../../server/api');

describe('{{next_post}} helper', function () {
    describe('with valid post data - ', function () {
        var sandbox;
        beforeEach(function () {
            sandbox = sinon.sandbox.create();
            utils.loadHelpers();
            sandbox.stub(api.posts, 'read', function (options) {
                if (options.include === 'next') {
                    return Promise.resolve({
                        posts: [{slug: '/current/', title: 'post 2', next: {slug: '/next/', title: 'post 3'}}]
                    });
                }
            });
        });

        afterEach(function () {
            sandbox.restore();
        });

        it('has loaded next_post helper', function () {
            should.exist(handlebars.helpers.prev_post);
        });

        it('shows \'if\' template with next post data', function (done) {
            var fn = sinon.spy(),
                inverse = sinon.spy(),
                optionsData = {name: 'next_post', fn: fn, inverse: inverse};

            helpers.prev_post.call({html: 'content',
                status: 'published',
                markdown: 'ff',
                title: 'post2',
                slug: 'current',
                created_at: new Date(0),
                url: '/current/'}, optionsData).then(function () {
                fn.called.should.be.true;
                inverse.called.should.be.false;
                done();
            }).catch(function (err) {
                console.log('err ', err);
                done(err);
            });
        });
    });

    describe('for valid post with no next post', function () {
        var sandbox;

        beforeEach(function () {
            sandbox = sinon.sandbox.create();
            utils.loadHelpers();
            sandbox.stub(api.posts, 'read', function (options) {
                if (options.include === 'next') {
                    return Promise.resolve({posts: [{slug: '/current/', title: 'post 2'}]});
                }
            });
        });

        afterEach(function () {
            sandbox.restore();
        });

        it('shows \'else\' template', function (done) {
            var fn = sinon.spy(),
                inverse = sinon.spy(),
                optionsData = {name: 'next_post', fn: fn, inverse: inverse};

            helpers.prev_post.call({html: 'content',
                markdown: 'ff',
                title: 'post2',
                slug: 'current',
                created_at: new Date(0),
                url: '/current/'}, optionsData).then(function () {
                fn.called.should.be.false;
                inverse.called.should.be.true;
                done();
            }).catch(function (err) {
                done(err);
            });
        });
    });

    describe('for invalid post data', function () {
        var sandbox;

        beforeEach(function () {
            sandbox = sinon.sandbox.create();
            utils.loadHelpers();
            sandbox.stub(api.posts, 'read', function (options) {
                if (options.include === 'previous') {
                    return Promise.resolve({});
                }
            });
        });

        afterEach(function () {
            sandbox.restore();
        });

        it('shows \'else\' template', function (done) {
            var fn = sinon.spy(),
                inverse = sinon.spy(),
                optionsData = {name: 'next_post', fn: fn, inverse: inverse};

            helpers.prev_post.call({}, optionsData).then(function () {
                fn.called.should.be.false;
                inverse.called.should.be.true;
                done();
            }).catch(function (err) {
                done(err);
            });
        });
    });

    describe('for unpublished post', function () {
        var sandbox;

        beforeEach(function () {
            sandbox = sinon.sandbox.create();
            utils.loadHelpers();
            sandbox.stub(api.posts, 'read', function (options) {
                if (options.include === 'next') {
                    return Promise.resolve({
                        posts: [{slug: '/current/', title: 'post 2', next: {slug: '/next/', title: 'post 3'}}]
                    });
                }
            });
        });

        afterEach(function () {
            sandbox.restore();
        });

        it('shows \'else\' template', function (done) {
            var fn = sinon.spy(),
                inverse = sinon.spy(),
                optionsData = {name: 'next_post', fn: fn, inverse: inverse};

            helpers.prev_post.call({html: 'content',
                status: 'published',
                markdown: 'ff',
                title: 'post2',
                slug: 'current',
                created_at: new Date(0),
                url: '/current/'}, optionsData)
            .then(function () {
                fn.called.should.be.true;
                inverse.called.should.be.false;
                done();
            }).catch(function (err) {
                done(err);
            });
        });
    });
});
