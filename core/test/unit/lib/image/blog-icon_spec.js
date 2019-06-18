var should = require('should'),
    sinon = require('sinon'),
    _ = require('lodash'),
    path = require('path'),
    rewire = require('rewire'),
    settingsCache = require('../../../../server/services/settings/cache'),
    storageUtils = require('../../../../server/adapters/storage/utils'),
    urlUtils = require('../../../utils/urlUtils'),

    // stuff we are testing
    blogIcon = rewire('../../../../server/lib/image/blog-icon');

describe('lib/image: blog icon', function () {
    afterEach(function () {
        sinon.restore();
        rewire('../../../../server/lib/image/blog-icon');
    });

    describe('getIconUrl', function () {
        it('custom uploaded ico blog icon', function () {
            sinon.stub(settingsCache, 'get').withArgs('icon').returns('/content/images/2017/04/my-icon.ico');
            blogIcon.getIconUrl().should.eql('/favicon.ico');
        });

        it('custom uploaded png blog icon', function () {
            sinon.stub(settingsCache, 'get').withArgs('icon').returns('/content/images/2017/04/my-icon.png');
            blogIcon.getIconUrl().should.eql('/favicon.png');
        });

        it('default ico blog icon', function () {
            blogIcon.getIconUrl().should.eql('/favicon.ico');
        });

        describe('absolute URL', function () {
            it('custom uploaded ico blog icon', function () {
                blogIcon.__set__('urlUtils', urlUtils.getInstance({url: 'http://my-ghost-blog.com/'}));
                sinon.stub(settingsCache, 'get').withArgs('icon').returns('/content/images/2017/04/my-icon.ico');
                blogIcon.getIconUrl(true).should.eql('http://my-ghost-blog.com/favicon.ico');
            });

            it('custom uploaded png blog icon', function () {
                blogIcon.__set__('urlUtils', urlUtils.getInstance({url: 'http://my-ghost-blog.com/'}));
                sinon.stub(settingsCache, 'get').withArgs('icon').returns('/content/images/2017/04/my-icon.png');
                blogIcon.getIconUrl(true).should.eql('http://my-ghost-blog.com/favicon.png');
            });

            it('default ico blog icon', function () {
                blogIcon.__set__('urlUtils', urlUtils.getInstance({url: 'http://my-ghost-blog.com/'}));
                blogIcon.getIconUrl(true).should.eql('http://my-ghost-blog.com/favicon.ico');
            });
        });

        describe('with subdirectory', function () {
            it('custom uploaded ico blog icon', function () {
                sinon.stub(settingsCache, 'get').withArgs('icon').returns('/content/images/2017/04/my-icon.ico');
                blogIcon.__set__('urlUtils', urlUtils.getInstance({url: 'http://my-ghost-blog.com/blog'}));

                blogIcon.getIconUrl().should.eql('/blog/favicon.ico');
            });

            it('custom uploaded png blog icon', function () {
                sinon.stub(settingsCache, 'get').withArgs('icon').returns('/content/images/2017/04/my-icon.png');
                blogIcon.__set__('urlUtils', urlUtils.getInstance({url: 'http://my-ghost-blog.com/blog'}));

                blogIcon.getIconUrl().should.eql('/blog/favicon.png');
            });

            it('default ico blog icon', function () {
                blogIcon.__set__('urlUtils', urlUtils.getInstance({url: 'http://my-ghost-blog.com/blog'}));
                blogIcon.getIconUrl().should.eql('/blog/favicon.ico');
            });
        });
    });

    describe('getIconPath', function () {
        it('custom uploaded ico blog icon', function () {
            sinon.stub(settingsCache, 'get').withArgs('icon').returns('/content/images/2017/04/my-icon.ico');
            sinon.stub(storageUtils, 'getLocalFileStoragePath');
            blogIcon.getIconPath();

            storageUtils.getLocalFileStoragePath.calledOnce.should.be.true();
        });

        it('custom uploaded png blog icon', function () {
            sinon.stub(settingsCache, 'get').withArgs('icon').returns('/content/images/2017/04/my-icon.png');
            sinon.stub(storageUtils, 'getLocalFileStoragePath');
            blogIcon.getIconPath();

            storageUtils.getLocalFileStoragePath.calledOnce.should.be.true();
        });

        it('default ico blog icon', function () {
            blogIcon.getIconPath().should.eql(path.join(__dirname, '../../../../server/public/favicon.ico'));
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

    describe('getIconDimensions', function () {
        it('[success] returns .ico dimensions', function (done) {
            blogIcon.getIconDimensions(path.join(__dirname, '../../../utils/fixtures/images/favicon.ico'))
                .then(function (result) {
                    should.exist(result);
                    result.should.eql({
                        width: 48,
                        height: 48
                    });
                    done();
                }).catch(done);
        });

        it('[success] returns .png dimensions', function (done) {
            blogIcon.getIconDimensions(path.join(__dirname, '../../../utils/fixtures/images/favicon.png'))
                .then(function (result) {
                    should.exist(result);
                    result.should.eql({
                        width: 100,
                        height: 100
                    });
                    done();
                }).catch(done);
        });

        it('[success] returns .ico dimensions for icon with multiple sizes', function (done) {
            blogIcon.getIconDimensions(path.join(__dirname, '../../../utils/fixtures/images/favicon_multi_sizes.ico'))
                .then(function (result) {
                    should.exist(result);
                    result.should.eql({
                        width: 64,
                        height: 64
                    });
                    done();
                }).catch(done);
        });

        it('[failure] return error message', function (done) {
            var sizeOfStub = sinon.stub();

            sizeOfStub.throws({error: 'image-size could not find dimensions'});

            blogIcon.__set__('sizeOf', sizeOfStub);

            blogIcon.getIconDimensions(path.join(__dirname, '../../../utils/fixtures/images/favicon_multi_sizes.ico'))
                .catch(function (error) {
                    should.exist(error);
                    error.message.should.eql('Could not fetch icon dimensions.');
                    done();
                });
        });
    });
});
