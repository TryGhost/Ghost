const assert = require('node:assert/strict');
const {assertExists} = require('../../../utils/assertions');
const sinon = require('sinon');
const ObjectId = require('bson-objectid').default;
const urlService = require('../../../../core/server/services/url');
const getAuthorUrl = require('../../../../core/frontend/meta/author-url');

describe('getAuthorUrl', function () {
    /** @type {import('sinon').SinonStub} */
    let urlServiceGetUrlForResourceStub;

    beforeEach(function () {
        urlServiceGetUrlForResourceStub = sinon.stub(urlService.facade, 'getUrlForResource');
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

        urlServiceGetUrlForResourceStub.withArgs(sinon.match({id: post.primary_author.id, type: 'authors'}), {absolute: undefined, withSubdirectory: true})
            .returns('author url');

        assertExists(getAuthorUrl({
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

        urlServiceGetUrlForResourceStub.withArgs(sinon.match({id: post.primary_author.id, type: 'authors'}), {absolute: true, withSubdirectory: true})
            .returns('absolute author url');

        assertExists(getAuthorUrl({
            context: ['post'],
            post: post
        }, true));
    });

    it('should return author url if data contains author', function () {
        const author = {
            id: ObjectId().toHexString(),
            slug: 'test-author'
        };

        urlServiceGetUrlForResourceStub.withArgs(sinon.match({id: author.id, type: 'authors'}), {absolute: undefined, withSubdirectory: true})
            .returns('author url');

        assertExists(getAuthorUrl({
            author: author
        }));
    });

    it('should return null if no author on data or context', function () {
        assert.equal(getAuthorUrl({}, true), null);
    });
});
