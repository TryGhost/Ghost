const _ = require('lodash');
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

    it('should adjust image sizes to a max width', function (done) {
        const originalMetaData = {
            coverImage: {
                url: 'http://mysite.com/content/images/mypostcoverimage.jpg'
            },
            authorImage: {
                url: 'http://mysite.com/content/images/me.jpg'
            },
            ogImage: {
                url: 'http://mysite.com/content/images/super-facebook-image.jpg'
            },
            twitterImage: 'http://mysite.com/content/images/super-twitter-image.jpg',
            site: {
                logo: {
                    url: 'http://mysite.com/content/images/logo.jpg'
                }
            }
        };

        // getImageDimensions modifies metaData so we clone so we can compare
        // against the original
        const metaData = _.cloneDeep(originalMetaData);

        // callsFake rather than returns otherwise the object is passed by
        // reference and assigned to each image meaning it gets modified when
        // the first image is resized and later images no longer look oversized
        sizeOfStub.callsFake(() => ({
            width: 2000,
            height: 1200,
            type: 'jpg'
        }));

        getImageDimensions.__set__('imageSizeCache', {
            getCachedImageSizeFromUrl: sizeOfStub
        });

        getImageDimensions(metaData).then(function (result) {
            should.exist(result);
            sizeOfStub.calledWith(originalMetaData.coverImage.url).should.be.true();
            sizeOfStub.calledWith(originalMetaData.authorImage.url).should.be.true();
            sizeOfStub.calledWith(originalMetaData.ogImage.url).should.be.true();
            sizeOfStub.calledWith(originalMetaData.twitterImage).should.be.true();
            sizeOfStub.calledWith(originalMetaData.site.logo.url).should.be.true();
            result.coverImage.should.have.property('url');
            result.coverImage.url.should.eql('http://mysite.com/content/images/size/w1200/mypostcoverimage.jpg');
            result.coverImage.should.have.property('dimensions');
            result.coverImage.dimensions.should.have.property('width', 1200);
            result.coverImage.dimensions.should.have.property('height', 720);
            result.authorImage.should.have.property('url');
            result.authorImage.url.should.eql('http://mysite.com/content/images/size/w1200/me.jpg');
            result.authorImage.should.have.property('dimensions');
            result.authorImage.dimensions.should.have.property('width', 1200);
            result.authorImage.dimensions.should.have.property('height', 720);
            result.ogImage.should.have.property('url');
            result.ogImage.url.should.eql('http://mysite.com/content/images/size/w1200/super-facebook-image.jpg');
            result.ogImage.should.have.property('dimensions');
            result.ogImage.dimensions.should.have.property('width', 1200);
            result.ogImage.dimensions.should.have.property('height', 720);
            result.twitterImage.should.eql('http://mysite.com/content/images/size/w1200/super-twitter-image.jpg');
            done();
        }).catch(done);
    });

    it('does not append image size prefix to external images', function (done) {
        const originalMetaData = {
            coverImage: {
                url: 'http://anothersite.com/some/storage/mypostcoverimage.jpg'
            },
            authorImage: {
                url: 'http://anothersite.com/some/storage/me.jpg'
            },
            ogImage: {
                url: 'http://anothersite.com/some/storage/super-facebook-image.jpg'
            },
            twitterImage: 'http://anothersite.com/some/storage/super-twitter-image.jpg',
            site: {
                logo: {
                    url: 'http://anothersite.com/some/storage/logo.jpg'
                }
            }
        };

        const metaData = _.cloneDeep(originalMetaData);

        sizeOfStub.callsFake(() => ({
            width: 2000,
            height: 1200,
            type: 'jpg'
        }));

        getImageDimensions.__set__('imageSizeCache', {
            getCachedImageSizeFromUrl: sizeOfStub
        });

        getImageDimensions(metaData).then(function (result) {
            should.exist(result);
            result.coverImage.should.have.property('url');
            result.coverImage.url.should.eql('http://anothersite.com/some/storage/mypostcoverimage.jpg');
            result.authorImage.should.have.property('url');
            result.authorImage.url.should.eql('http://anothersite.com/some/storage/me.jpg');
            result.ogImage.should.have.property('url');
            result.ogImage.url.should.eql('http://anothersite.com/some/storage/super-facebook-image.jpg');
            result.site.logo.should.have.property('url');
            result.site.logo.url.should.eql('http://anothersite.com/some/storage/logo.jpg');
            done();
        }).catch(done);
    });
});
