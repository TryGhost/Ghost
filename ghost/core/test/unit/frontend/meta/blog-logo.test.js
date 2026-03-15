const assert = require('node:assert/strict');
const {assertExists} = require('../../../utils/assertions');
const getBlogLogo = require('../../../../core/frontend/meta/blog-logo');
const sinon = require('sinon');
const settingsCache = require('../../../../core/shared/settings-cache');
const config = require('../../../../core/shared/config');

describe('getBlogLogo', function () {
    afterEach(function () {
        sinon.restore();
    });

    it('should return logo if uploaded', function () {
        let blogLogo;

        sinon.stub(settingsCache, 'get').callsFake(function (key) {
            return {
                logo: '/content/images/logo.png',
                icon: null
            }[key];
        });

        blogLogo = getBlogLogo();
        assertExists(blogLogo);
        assert.equal(blogLogo.url, `${config.get('url')}/content/images/logo.png`);
    });

    it('should return custom uploaded png icon if no logo given', function () {
        let blogLogo;

        sinon.stub(settingsCache, 'get').callsFake(function (key) {
            return {
                logo: null,
                icon: '/content/images/favicon.png'
            }[key];
        });

        blogLogo = getBlogLogo();
        assertExists(blogLogo);
        assert.equal(blogLogo.url, `${config.get('url')}/content/images/size/w256h256/favicon.png`);
    });
});
