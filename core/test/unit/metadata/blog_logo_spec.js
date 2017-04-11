var should        = require('should'),
    getBlogLogo   = require('../../../server/data/meta/blog_logo'),
    sinon         = require('sinon'),
    Promise       = require('bluebird'),
    settingsCache = require('../../../server/settings/cache'),
    blogIconUtils = require('../../../server/utils/blog-icon'),

    sandbox       = sinon.sandbox.create();

describe('getBlogLogo', function () {
    afterEach(function () {
        sandbox.restore();
    });

    it('should return logo if uploaded', function (done) {
        sandbox.stub(settingsCache, 'get', function (key) {
            return {
                logo: '/content/images/logo.png',
                icon: null
            }[key];
        });

        getBlogLogo().then(function (blogLogo) {
            should.exist(blogLogo);
            blogLogo.should.have.property('url', 'http://127.0.0.1:2369/content/images/logo.png');
        }).catch(done);

        done();
    });

    it('should return custom uploaded png icon if no logo given', function (done) {
        sandbox.stub(settingsCache, 'get', function (key) {
            return {
                logo: null,
                icon: '/content/images/favicon.png'
            }[key];
        });

        getBlogLogo().then(function (blogLogo) {
            should.exist(blogLogo);
            blogLogo.should.have.property('url', 'http://127.0.0.1:2369/favicon.png');
        }).catch(done);

        done();
    });

    it('should return custom uploaded ico icon incl. dimensions if no logo given', function (done) {
        sandbox.stub(settingsCache, 'get', function (key) {
            return {
                logo: null,
                icon: '/content/images/myicon.ico'
            }[key];
        });

        sandbox.stub(blogIconUtils, 'getIconDimensions').returns(Promise.resolve({width: 48, height: 48}));

        getBlogLogo().then(function (blogLogo) {
            should.exist(blogLogo);
            blogLogo.should.have.property('url', 'http://127.0.0.1:2369/favicon.ico');
            blogLogo.should.have.property('dimensions');
            blogLogo.dimensions.should.have.property('width', 48);
            blogLogo.dimensions.should.have.property('height', 48);
        }).catch(done);

        done();
    });

    it('should return default favicon with dimensions if no logo or icon uploaded', function (done) {
        getBlogLogo().then(function (blogLogo) {
            should.exist(blogLogo);
            blogLogo.should.have.property('url', 'http://127.0.0.1:2369/favicon.ico');
            blogLogo.should.have.property('dimensions');
            blogLogo.dimensions.should.have.property('width', 64);
            blogLogo.dimensions.should.have.property('height', 64);
        }).catch(done);

        done();
    });

    it.skip('[failure] can handle errors', function (done) {
        sandbox.stub(settingsCache, 'get', function (key) {
            return {
                logo: null,
                icon: '/content/images/myicon.ico'
            }[key];
        });

        sandbox.stub(blogIconUtils, 'getIconDimensions').returns(Promise.reject(new Error({message: 'could not fetch icon size'})));

        getBlogLogo().then(function (blogLogo) {
            should.not.exist(blogLogo);
            done(new Error('should not resolve'));
        }).catch(function (err) {
            err.message.should.equal('could not fetch icon size');
            done();
        });
    });
});
