var should = require('should'),
    getBlogLogo = require('../../../server/data/meta/blog_logo'),
    sinon = require('sinon'),
    settingsCache = require('../../../server/settings/cache'),
    sandbox = sinon.sandbox.create();

describe('getBlogLogo', function () {
    afterEach(function () {
        sandbox.restore();
    });

    it('should return logo if uploaded', function () {
        var blogLogo;

        sandbox.stub(settingsCache, 'get', function (key) {
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

        sandbox.stub(settingsCache, 'get', function (key) {
            return {
                logo: null,
                icon: '/content/images/favicon.png'
            }[key];
        });

        blogLogo = getBlogLogo();
        should.exist(blogLogo);
        blogLogo.should.have.property('url', 'http://127.0.0.1:2369/content/images/favicon.png');
    });

    it('should return custom uploaded ico icon incl. dimensions if no logo given', function () {
        var blogLogo;

        sandbox.stub(settingsCache, 'get', function (key) {
            return {
                logo: null,
                icon: '/content/images/myicon.ico'
            }[key];
        });

        blogLogo = getBlogLogo();
        should.exist(blogLogo);
        blogLogo.should.have.property('url', 'http://127.0.0.1:2369/content/images/myicon.ico');
        blogLogo.should.have.property('dimensions');
        blogLogo.dimensions.should.have.property('width', 60);
        blogLogo.dimensions.should.have.property('height', 60);
    });

    it('should return default favicon with dimensions if no logo or icon uploaded', function () {
        var blogLogo = getBlogLogo();

        blogLogo = getBlogLogo();
        should.exist(blogLogo);
        blogLogo.should.have.property('url', 'http://127.0.0.1:2369/favicon.ico');
        blogLogo.should.have.property('dimensions');
        blogLogo.dimensions.should.have.property('width', 60);
        blogLogo.dimensions.should.have.property('height', 60);
    });
});
