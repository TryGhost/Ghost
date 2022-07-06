const should = require('should');
const getBlogLogo = require('../../../../core/frontend/meta/blog-logo');
const sinon = require('sinon');
const settingsCache = require('../../../../core/shared/settings-cache');

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
        should.exist(blogLogo);
        blogLogo.should.have.property('url', 'http://127.0.0.1:2369/content/images/logo.png');
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
        should.exist(blogLogo);
        blogLogo.should.have.property('url', 'http://127.0.0.1:2369/content/images/size/w256h256/favicon.png');
    });
});
