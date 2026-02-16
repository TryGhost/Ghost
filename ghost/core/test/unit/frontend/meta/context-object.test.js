const assert = require('node:assert/strict');
const {assertExists} = require('../../../utils/assertions');
const should = require('should');
const sinon = require('sinon');
const getContextObject = require('../../../../core/frontend/meta/context-object.js');
const settingsCache = require('../../../../core/shared/settings-cache');

describe('getContextObject', function () {
    let data;
    let context;
    let contextObject;

    it('should be a function', function () {
        assertExists(getContextObject);
    });

    it('should return post context object for a post', function () {
        data = {post: {id: 2}};
        context = ['post'];
        contextObject = getContextObject(data, context);

        assertExists(contextObject);
        assert.equal(contextObject, data.post);
    });

    it('should return post context object for a static page', function () {
        data = {post: {id: 2}};
        context = ['page'];
        contextObject = getContextObject(data, context);

        assertExists(contextObject);
        assert.equal(contextObject, data.post);
    });

    it('should return page', function () {
        data = {page: {id: 2}};
        context = ['news', 'page'];
        contextObject = getContextObject(data, context);

        assertExists(contextObject);
        assert.equal(contextObject, data.page);
    });

    describe('override blog', function () {
        before(function () {
            sinon.stub(settingsCache, 'get').callsFake(function (key) {
                return {
                    cover_image: 'test.png'
                }[key];
            });
        });

        after(function () {
            sinon.restore();
        });

        it('should return blog context object for unknown context', function () {
            data = {post: {id: 2}};
            context = ['unknown'];
            contextObject = getContextObject(data, context);

            assertExists(contextObject);
            assert.equal(contextObject.cover_image, 'test.png');
        });
    });
});
