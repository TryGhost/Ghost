const assert = require('node:assert/strict');
const sinon = require('sinon');
const rewire = require('rewire');
const urlUtils = require('../../../../core/shared/url-utils');
const testUtils = require('../../../utils');

let getCanonicalUrl = rewire('../../../../core/frontend/meta/canonical-url');

describe('getCanonicalUrl', function () {
    let getUrlStub;
    let urlJoinStub;
    let urlForStub;

    beforeEach(function () {
        getUrlStub = sinon.stub();

        getCanonicalUrl = rewire('../../../../core/frontend/meta/canonical-url');
        getCanonicalUrl.__set__('getUrl', getUrlStub);

        urlJoinStub = sinon.stub(urlUtils, 'urlJoin');
        urlForStub = sinon.stub(urlUtils, 'urlFor').withArgs('home', true).returns('http://localhost:9999');
    });

    afterEach(function () {
        sinon.restore();
    });

    it('should return default canonical url', function () {
        const post = testUtils.DataGenerator.forKnex.createPost();

        getUrlStub.withArgs(post, false).returns('/post-url/');
        urlJoinStub.withArgs('http://localhost:9999', '/post-url/').returns('canonical url');

        assert.equal(getCanonicalUrl(post), 'canonical url');

        assert.equal(urlJoinStub.calledOnce, true);
        assert.equal(urlForStub.calledOnce, true);
        assert.equal(getUrlStub.calledOnce, true);
    });

    it('should return canonical url field if present', function () {
        const post = testUtils.DataGenerator.forKnex.createPost({canonical_url: 'https://example.com/canonical'});

        assert.equal(getCanonicalUrl({
            context: ['post'],
            post: post
        }), 'https://example.com/canonical');

        assert.equal(getUrlStub.called, false);
    });

    it('should return home if empty secure data', function () {
        getUrlStub.withArgs({secure: true}, false).returns('/');
        urlJoinStub.withArgs('http://localhost:9999', '/').returns('canonical url');

        assert.equal(getCanonicalUrl({secure: true}), 'canonical url');

        assert.equal(urlJoinStub.calledOnce, true);
        assert.equal(urlForStub.calledOnce, true);
        assert.equal(getUrlStub.calledOnce, true);
    });
});
