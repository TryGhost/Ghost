const should = require('should');
const sinon = require('sinon');
const rewire = require('rewire');
const getImageDimensions = rewire('../../../../core/frontend/meta/image-dimensions');

describe('getImageDimensions', function () {
    let sizeOfStub;

    beforeEach(function () {
        sizeOfStub = sinon.stub();
    });

    afterEach(function () {
        sinon.restore();
    });

    it('should return dimension for images', function (done) {
        const metaData = {
            coverImage: {
                url: 'http://mysite.com/content/image/mypostcoverimage.jpg'
            },
            authorImage: {
                url: 'http://mysite.com/author/image/url/me.jpg'
            },
            ogImage: {
                url: 'http://mysite.com/content/image/super-facebook-image.jpg'
            },
            site: {
                logo: {
                    url: 'http://mysite.com/author/image/url/logo.jpg'
                }
            }
        };

        sizeOfStub.returns({
            width: 50,
            height: 50,
            type: 'jpg'
        });

        getImageDimensions.__set__('imageSizeCache', {
            getCachedImageSizeFromUrl: sizeOfStub
        });

        getImageDimensions(metaData).then(function (result) {
            should.exist(result);
            sizeOfStub.calledWith(metaData.coverImage.url).should.be.true();
            sizeOfStub.calledWith(metaData.authorImage.url).should.be.true();
            sizeOfStub.calledWith(metaData.ogImage.url).should.be.true();
            sizeOfStub.calledWith(metaData.site.logo.url).should.be.true();
            result.coverImage.should.have.property('dimensions');
            result.coverImage.should.have.property('url');
            result.coverImage.dimensions.should.have.property('width', 50);
            result.coverImage.dimensions.should.have.property('height', 50);
            result.authorImage.should.have.property('dimensions');
            result.authorImage.should.have.property('url');
            result.authorImage.dimensions.should.have.property('width', 50);
            result.authorImage.dimensions.should.have.property('height', 50);
            result.ogImage.should.have.property('dimensions');
            result.ogImage.should.have.property('url');
            result.ogImage.dimensions.should.have.property('width', 50);
            result.ogImage.dimensions.should.have.property('height', 50);
            result.site.logo.should.have.property('dimensions');
            result.site.logo.should.have.property('url');
            result.site.logo.dimensions.should.have.property('width', 50);
            result.site.logo.dimensions.should.have.property('height', 50);
            done();
        }).catch(done);
    });

    it('should return metaData if url is undefined or null', function (done) {
        const metaData = {
            coverImage: {
                url: undefined
            },
            authorImage: {
                url: null
            },
            ogImage: {
                url: ''
            },
            twitterImage: {
                url: null
            },
            site: {
                logo: {
                    url: 'noUrl'
                }
            }
        };

        sizeOfStub.returns({});

        getImageDimensions.__set__('imageSizeCache', {
            getCachedImageSizeFromUrl: sizeOfStub
        });

        getImageDimensions(metaData).then(function (result) {
            should.exist(result);
            sizeOfStub.calledWith(metaData.coverImage.url).should.be.true();
            sizeOfStub.calledWith(metaData.authorImage.url).should.be.true();
            sizeOfStub.calledWith(metaData.ogImage.url).should.be.true();
            sizeOfStub.calledWith(metaData.site.logo.url).should.be.true();
            result.coverImage.should.not.have.property('dimensions');
            result.coverImage.should.have.property('url');
            result.authorImage.should.not.have.property('dimensions');
            result.authorImage.should.have.property('url');
            result.ogImage.should.not.have.property('dimensions');
            result.ogImage.should.have.property('url');
            result.site.logo.should.not.have.property('dimensions');
            result.site.logo.should.have.property('url');
            done();
        }).catch(done);
    });

    it('should fake image dimension for publisher.logo if file is too big and square', function (done) {
        const metaData = {
            coverImage: {
                url: 'http://mysite.com/content/image/mypostcoverimage.jpg'
            },
            authorImage: {
                url: 'http://mysite.com/author/image/url/me.jpg'
            },
            ogImage: {
                url: 'http://mysite.com/content/image/super-facebook-image.jpg'
            },
            site: {
                logo: {
                    url: 'http://mysite.com/author/image/url/favicon.ico'
                }
            }
        };

        sizeOfStub.returns({
            width: 480,
            height: 480,
            type: 'jpg'
        });

        getImageDimensions.__set__('imageSizeCache', {
            getCachedImageSizeFromUrl: sizeOfStub
        });

        getImageDimensions(metaData).then(function (result) {
            should.exist(result);
            sizeOfStub.calledWith(metaData.coverImage.url).should.be.true();
            sizeOfStub.calledWith(metaData.authorImage.url).should.be.true();
            sizeOfStub.calledWith(metaData.ogImage.url).should.be.true();
            sizeOfStub.calledWith(metaData.site.logo.url).should.be.true();
            result.coverImage.should.have.property('url');
            result.coverImage.should.have.property('dimensions');
            result.coverImage.dimensions.should.have.property('height', 480);
            result.coverImage.dimensions.should.have.property('width', 480);
            result.site.logo.should.have.property('url');
            result.site.logo.should.have.property('dimensions');
            result.site.logo.dimensions.should.have.property('height', 60);
            result.site.logo.dimensions.should.have.property('width', 60);
            result.authorImage.should.have.property('url');
            result.authorImage.should.have.property('dimensions');
            result.authorImage.dimensions.should.have.property('height', 480);
            result.authorImage.dimensions.should.have.property('width', 480);
            result.ogImage.should.have.property('url');
            result.ogImage.should.have.property('dimensions');
            result.ogImage.dimensions.should.have.property('height', 480);
            result.ogImage.dimensions.should.have.property('width', 480);
            done();
        }).catch(done);
    });

    it('should not fake dimension for publisher.logo if a logo is too big but not square', function (done) {
        const metaData = {
            coverImage: {
                url: 'http://mysite.com/content/image/mypostcoverimage.jpg'
            },
            authorImage: {
                url: 'http://mysite.com/author/image/url/me.jpg'
            },
            ogImage: {
                url: 'http://mysite.com/content/image/super-facebook-image.jpg'
            },
            site: {
                logo: {
                    url: 'http://mysite.com/author/image/url/logo.jpg'
                }
            }
        };

        sizeOfStub.returns({
            width: 80,
            height: 480,
            type: 'jpg'
        });

        getImageDimensions.__set__('imageSizeCache', {
            getCachedImageSizeFromUrl: sizeOfStub
        });

        getImageDimensions(metaData).then(function (result) {
            should.exist(result);
            sizeOfStub.calledWith(metaData.coverImage.url).should.be.true();
            sizeOfStub.calledWith(metaData.authorImage.url).should.be.true();
            sizeOfStub.calledWith(metaData.ogImage.url).should.be.true();
            sizeOfStub.calledWith(metaData.site.logo.url).should.be.true();
            result.coverImage.should.have.property('dimensions');
            result.coverImage.should.have.property('url');
            result.coverImage.dimensions.should.have.property('height', 480);
            result.coverImage.dimensions.should.have.property('width', 80);
            result.authorImage.should.have.property('dimensions');
            result.authorImage.should.have.property('url');
            result.authorImage.dimensions.should.have.property('height', 480);
            result.authorImage.dimensions.should.have.property('width', 80);
            result.ogImage.should.have.property('dimensions');
            result.ogImage.should.have.property('url');
            result.ogImage.dimensions.should.have.property('height', 480);
            result.ogImage.dimensions.should.have.property('width', 80);
            result.site.logo.should.have.property('url');
            result.site.logo.should.not.have.property('dimensions');
            done();
        }).catch(done);
    });
});
