var should          = require('should'),
    config = require('../../../../server/config'),
    getContextObject = require(config.paths.corePath + '/server/data/meta/context_object.js'),
    configUtils     = require(config.paths.corePath + '/test/utils/configUtils');

describe('getContextObject', function () {
    var data, context, contextObject;

    it('should be a function', function () {
        should.exist(getContextObject);
    });

    it('should return post context object for a post', function () {
        data = {post: {id: 2}};
        context = 'post';
        contextObject = getContextObject(data, context);

        should.exist(contextObject);
        contextObject.should.eql(data.post);
    });

    it('should return post context object for a static page', function () {
        data = {post: {id: 2}};
        context = 'page';
        contextObject = getContextObject(data, context);

        should.exist(contextObject);
        contextObject.should.eql(data.post);
    });

    describe('override blog', function () {
        before(function () {
            configUtils.set({theme: {foo: 'bar'}});
        });

        after(function () {
            configUtils.restore();
        });

        it('should return blog context object for unknown context', function () {
            data = {post: {id: 2}};
            context = 'unknown';
            contextObject = getContextObject(data, context);

            should.exist(contextObject);
            contextObject.should.have.property('foo', 'bar');
        });
    });
});
