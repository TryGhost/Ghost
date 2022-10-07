const should = require('should');
const sinon = require('sinon');
const ObjectId = require('bson-objectid');
const urlService = require('../../../../core/server/services/url');
const getAuthorUrl = require('../../../../core/frontend/meta/author-url');

describe('getAuthorUrl', function () {
    beforeEach(function () {
        sinon.stub(urlService, 'getUrlByResourceId');
    });

    afterEach(function () {
        sinon.restore();
    });

    it('should return author url if context contains primary author', function () {
        const post = {
            primary_author: {
                id: ObjectId().toHexString(),
                slug: 'test-author'
            }
        };

        urlService.getUrlByResourceId.withArgs(post.primary_author.id, {absolute: undefined, withSubdirectory: true})
            .returns('author url');

        should.exist(getAuthorUrl({
            context: ['post'],
            post: post
        }));
    });

    it('should return absolute author url if context contains primary author', function () {
        const post = {
            primary_author: {
                id: ObjectId().toHexString(),
                slug: 'test-author'
            }
        };

        urlService.getUrlByResourceId.withArgs(post.primary_author.id, {absolute: true, withSubdirectory: true})
            .returns('absolute author url');

        should.exist(getAuthorUrl({
            context: ['post'],
            post: post
        }, true));
    });

    it('should return author url for AMP if context contains primary author', function () {
        const post = {
            primary_author: {
                id: ObjectId().toHexString(),
                slug: 'test-author'
            }
        };

        urlService.getUrlByResourceId.withArgs(post.primary_author.id, {absolute: undefined, withSubdirectory: true})
            .returns('author url');

        should.exist(getAuthorUrl({
            context: ['amp', 'post'],
            post: post
        }));
    });

    it('should return author url if data contains author', function () {
        const author = {
            id: ObjectId().toHexString(),
            slug: 'test-author'
        };

        urlService.getUrlByResourceId.withArgs(author.id, {absolute: undefined, withSubdirectory: true})
            .returns('author url');

        should.exist(getAuthorUrl({
            author: author
        }));
    });

    it('should return null if no author on data or context', function () {
        should.not.exist(getAuthorUrl({}, true));
    });
});
