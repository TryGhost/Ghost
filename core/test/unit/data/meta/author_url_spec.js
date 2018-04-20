const should = require('should'),
    sinon = require('sinon'),
    ObjectId = require('bson-objectid'),
    sandbox = sinon.sandbox.create(),
    urlService = require('../../../../server/services/url'),
    getAuthorUrl = require('../../../../server/data/meta/author_url');

describe('getAuthorUrl', function () {
    beforeEach(function () {
        sandbox.stub(urlService, 'getUrlByResourceId');
    });

    afterEach(function () {
        sandbox.restore();
    });

    it('should return author url if context contains primary author', function () {
        const post = {
            primary_author: {
                id: ObjectId.generate(),
                slug: 'test-author'
            }
        };

        urlService.getUrlByResourceId.withArgs(post.primary_author.id, {absolute: undefined, secure: undefined})
            .returns('author url');

        should.exist(getAuthorUrl({
            context: ['post'],
            post: post
        }));
    });

    it('should return absolute author url if context contains primary author', function () {
        const post = {
            primary_author: {
                id: ObjectId.generate(),
                slug: 'test-author'
            }
        };

        urlService.getUrlByResourceId.withArgs(post.primary_author.id, {absolute: true, secure: undefined})
            .returns('absolute author url');

        should.exist(getAuthorUrl({
            context: ['post'],
            post: post
        }, true));
    });

    it('should return author url for AMP if context contains primary author', function () {
        const post = {
            primary_author: {
                id: ObjectId.generate(),
                slug: 'test-author'
            }
        };

        urlService.getUrlByResourceId.withArgs(post.primary_author.id, {absolute: undefined, secure: undefined})
            .returns('author url');

        should.exist(getAuthorUrl({
            context: ['amp', 'post'],
            post: post
        }));
    });

    it('should return author url if data contains author', function () {
        const author = {
            id: ObjectId.generate(),
            slug: 'test-author'
        };

        urlService.getUrlByResourceId.withArgs(author.id, {absolute: undefined, secure: undefined})
            .returns('author url');

        should.exist(getAuthorUrl({
            author: author
        }));
    });

    it('should return null if no author on data or context', function () {
        should.not.exist(getAuthorUrl({}, true));
    });
});
