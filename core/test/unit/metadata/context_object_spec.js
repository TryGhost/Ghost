var should = require('should'),
    sinon = require('sinon'),
    getContextObject = require('../../../server/data/meta/context_object.js'),
    settingsCache = require('../../../server/settings/cache'),
    sandbox = sinon.sandbox.create();

describe('getContextObject', function () {
    var data, context, contextObject;

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

    describe('override blog', function () {
        before(function () {
            sandbox.stub(settingsCache, 'get', function (key) {
                return {
                    cover_image: 'test.png'
                }[key];
            });
        });

        after(function () {
            sandbox.restore();
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
