const assert = require('node:assert/strict');
const sinon = require('sinon');
const routing = require('../../../../core/frontend/services/routing');
const getRssUrl = require('../../../../core/frontend/meta/rss-url');

describe('getRssUrl', function () {
    beforeEach(function () {
        sinon.stub(routing.registry, 'getRssUrl').returns('/rss/');
    });

    afterEach(function () {
        sinon.restore();
    });

    it('should return rss url', function () {
        const rssUrl = getRssUrl({
            secure: false
        });

        assert.equal(rssUrl, '/rss/');
    });

    it('forwards absolute flags', function () {
        getRssUrl({}, true);

        sinon.assert.calledWith(routing.registry.getRssUrl, {absolute: true});
    });
});
