const should = require('should');
const sinon = require('sinon');
const getContextObject = require('../../../../core/frontend/meta/context-object.js');
const settingsCache = require('../../../../core/shared/settings-cache');

describe('getContextObject', function () {
    let data;
    let context;
    let contextObject;

    it('should be a function', function () {
        should.exist(getContextObject);
    });

    it('should return post context object for a post', function () {
        data = {post: {id: 2}};
        context = ['post'];
        contextObject = getContextObject(data, context);

        should.exist(contextObject);
        contextObject.should.eql(data.post);
    });

    it('should return post context object for a static page', function () {
        data = {post: {id: 2}};
        context = ['page'];
        contextObject = getContextObject(data, context);

        should.exist(contextObject);
        contextObject.should.eql(data.post);
    });

    it('should return post context object for an AMP post', function () {
        data = {post: {id: 2}};
        context = ['amp', 'post'];
        contextObject = getContextObject(data, context);

        should.exist(contextObject);
        contextObject.should.eql(data.post);
    });

    it('should return post context object for a static page with amp context', function () {
        data = {post: {id: 2}};
        context = ['amp', 'page'];
        contextObject = getContextObject(data, context);

        should.exist(contextObject);
        contextObject.should.eql(data.post);
    });

    it('should return page', function () {
        data = {page: {id: 2}};
        context = ['news', 'page'];
        contextObject = getContextObject(data, context);

        should.exist(contextObject);
        contextObject.should.eql(data.page);
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

            should.exist(contextObject);
            contextObject.should.have.property('cover_image', 'test.png');
        });
    });
});
