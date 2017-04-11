// jshint unused: false
var should = require('should'),
    sinon = require('sinon'),
    _ = require('lodash'),
    settingsCache = require('../../../server/settings/cache'),
    configUtils = require('../../utils/configUtils'),
    testUtils = require('../../utils'),
    config = configUtils.config,
    path = require('path'),

    // stuff we are testing
    blogIcon = require('../../../server/utils/blog-icon'),

    sandbox = sinon.sandbox.create();

describe('Blog Icon', function () {
    before(function () {
        configUtils.restore();
    });

    afterEach(function () {
        configUtils.restore();
        sandbox.restore();
    });

    describe('getIconUrl', function () {
        it('custom uploaded ico blog icon', function () {
            sandbox.stub(settingsCache, 'get').withArgs('icon').returns('/content/images/2017/04/my-icon.ico');
            blogIcon.getIconUrl().should.eql('/favicon.ico');
        });

        it('custom uploaded png blog icon', function () {
            sandbox.stub(settingsCache, 'get').withArgs('icon').returns('/content/images/2017/04/my-icon.png');
            blogIcon.getIconUrl().should.eql('/favicon.png');
        });

        it('default ico blog icon', function () {
            blogIcon.getIconUrl().should.eql('/favicon.ico');
        });
        describe('absolute URL', function () {
            it('custom uploaded ico blog icon', function () {
                configUtils.set({url: 'http://my-ghost-blog.com/'});
                sandbox.stub(settingsCache, 'get').withArgs('icon').returns('/content/images/2017/04/my-icon.ico');
                blogIcon.getIconUrl(true).should.eql('http://my-ghost-blog.com/favicon.ico');
            });

            it('custom uploaded png blog icon', function () {
                configUtils.set({url: 'http://my-ghost-blog.com/'});
                sandbox.stub(settingsCache, 'get').withArgs('icon').returns('/content/images/2017/04/my-icon.png');
                blogIcon.getIconUrl(true).should.eql('http://my-ghost-blog.com/favicon.png');
            });

            it('default ico blog icon', function () {
                configUtils.set({url: 'http://my-ghost-blog.com/'});
                blogIcon.getIconUrl(true).should.eql('http://my-ghost-blog.com/favicon.ico');
            });
        });

        describe('with subdirectory', function () {
            it('custom uploaded ico blog icon', function () {
                sandbox.stub(settingsCache, 'get').withArgs('icon').returns('/content/images/2017/04/my-icon.ico');
                configUtils.set({url: 'http://my-ghost-blog.com/blog'});

                blogIcon.getIconUrl().should.eql('/blog/favicon.ico');
            });

            it('custom uploaded png blog icon', function () {
                sandbox.stub(settingsCache, 'get').withArgs('icon').returns('/content/images/2017/04/my-icon.png');
                configUtils.set({url: 'http://my-ghost-blog.com/blog'});

                blogIcon.getIconUrl().should.eql('/blog/favicon.png');
            });

            it('default ico blog icon', function () {
                configUtils.set({url: 'http://my-ghost-blog.com/blog'});
                blogIcon.getIconUrl().should.eql('/blog/favicon.ico');
            });
        });
    });

    describe('getIconPath', function () {
        it('custom uploaded ico blog icon', function () {
            sandbox.stub(settingsCache, 'get').withArgs('icon').returns('/content/images/2017/04/my-icon.ico');
            blogIcon.getIconPath().should.eql('/2017/04/my-icon.ico');
        });

        it('custom uploaded png blog icon', function () {
            sandbox.stub(settingsCache, 'get').withArgs('icon').returns('/content/images/2017/04/my-icon.png');
            blogIcon.getIconPath().should.eql('/2017/04/my-icon.png');
        });

        it('default ico blog icon', function () {
            blogIcon.getIconPath().should.eql(path.join(__dirname, '../../../server/public/favicon.ico'));
        });

        describe('with subdirectory', function () {
            it('custom uploaded ico blog icon', function () {
                sandbox.stub(settingsCache, 'get').withArgs('icon').returns('/blog/content/images/2017/04/my-icon.ico');
                configUtils.set({url: 'http://my-ghost-blog.com/blog'});

                blogIcon.getIconPath().should.eql('/2017/04/my-icon.ico');
            });

            it('custom uploaded png blog icon', function () {
                sandbox.stub(settingsCache, 'get').withArgs('icon').returns('/blog/content/images/2017/04/my-icon.png');
                configUtils.set({url: 'http://my-ghost-blog.com/blog'});

                blogIcon.getIconPath().should.eql('/2017/04/my-icon.png');
            });

            it('default ico blog icon', function () {
                configUtils.set({url: 'http://my-ghost-blog.com/blog'});
                blogIcon.getIconPath().should.eql(path.join(__dirname, '../../../server/public/favicon.ico'));
            });
        });
    });

    describe('isIcoImageType', function () {
        it('returns true, if icon is .ico filetype', function () {
            blogIcon.isIcoImageType('icon.ico').should.be.true();
        });

        it('returns false, if icon is not .ico filetype', function () {
            blogIcon.isIcoImageType('icon.png').should.be.false();
        });
    });

    describe('getIconType', function () {
        it('returns x-icon for ico icons', function () {
            blogIcon.getIconType('favicon.ico').should.eql('x-icon');
        });

        it('returns png for png icon', function () {
            blogIcon.getIconType('favicon.png').should.eql('png');
        });
    });

    describe.skip('getIconDimensions', function () {
        it('[success] returns icon dimensions', function (done) {
            done();
        });

        it('[failure] return error message', function (done) {
            done();
        });
    });
});
