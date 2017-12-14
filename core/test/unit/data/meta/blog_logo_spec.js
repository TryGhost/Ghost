var should        = require('should'),
    getBlogLogo   = require('../../../../server/data/meta/blog_logo'),
    sinon         = require('sinon'),
    settingsCache = require('../../../../server/services/settings/cache'),

    sandbox       = sinon.sandbox.create();

describe('getBlogLogo', function () {
    afterEach(function () {
        sandbox.restore();
    });

    it('should return logo if uploaded', function () {
        var blogLogo;

        sandbox.stub(settingsCache, 'get').callsFake(function (key) {
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
        var blogLogo;

        sandbox.stub(settingsCache, 'get').callsFake(function (key) {
            return {
                logo: null,
                icon: '/content/images/favicon.png'
            }[key];
        });

        blogLogo = getBlogLogo();
        should.exist(blogLogo);
        blogLogo.should.have.property('url', 'http://127.0.0.1:2369/favicon.png');
    });
});
