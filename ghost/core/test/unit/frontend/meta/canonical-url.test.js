const assert = require('node:assert/strict');
const sinon = require('sinon');
const urlUtils = require('../../../../core/shared/url-utils');
const urlService = require('../../../../core/server/services/url');
const testUtils = require('../../../utils');

const getCanonicalUrl = require('../../../../core/frontend/meta/canonical-url');

describe('getCanonicalUrl', function () {
    let getUrlForResourceStub;
    let urlJoinStub;
    let urlForStub;

    beforeEach(function () {
        getUrlForResourceStub = sinon.stub(urlService.facade, 'getUrlForResource');

        urlJoinStub = sinon.stub(urlUtils, 'urlJoin');
        urlForStub = sinon.stub(urlUtils, 'urlFor').withArgs('home', true).returns('http://localhost:9999');
    });

    afterEach(function () {
        sinon.restore();
    });

    it('should return default canonical url', function () {
        const post = testUtils.DataGenerator.forKnex.createPost();

        getUrlForResourceStub.returns('/post-url/');
        urlJoinStub.withArgs('http://localhost:9999', '/post-url/').returns('canonical url');

        assert.equal(getCanonicalUrl(post), 'canonical url');

        sinon.assert.calledOnce(urlJoinStub);
        sinon.assert.calledOnce(urlForStub);
        sinon.assert.calledOnce(getUrlForResourceStub);
    });

    it('should return canonical url field if present', function () {
        const post = testUtils.DataGenerator.forKnex.createPost({canonical_url: 'https://example.com/canonical'});

        assert.equal(getCanonicalUrl({
            context: ['post'],
            post: post
        }), 'https://example.com/canonical');

        sinon.assert.notCalled(getUrlForResourceStub);
    });

    it('should return home if empty secure data', function () {
        const data = {secure: true};

        urlForStub.withArgs(data, {}, false).returns('/');
        urlJoinStub.withArgs('http://localhost:9999', '/').returns('canonical url');

        assert.equal(getCanonicalUrl(data), 'canonical url');

        sinon.assert.calledOnce(urlJoinStub);
        sinon.assert.calledOnce(urlForStub);
        sinon.assert.notCalled(getUrlForResourceStub);
    });
});
