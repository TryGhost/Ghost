var should = require('should'),
    sinon = require('sinon'),
    rewire = require('rewire'),

// Stuff we are testing
    getImageDimensions = rewire('../../../server/data/meta/image-dimensions'),
    getCachedImageSizeFromUrl = rewire('../../../server/utils/cached-image-size-from-url'),

    sandbox = sinon.sandbox.create();

describe('getImageDimensions', function () {
    var sizeOfStub;

    beforeEach(function () {
        sizeOfStub = sandbox.stub();
    });

    afterEach(function () {
        sandbox.restore();
        getCachedImageSizeFromUrl.__set__('imageSizeCache', {});
    });

    it('should return dimension for images', function (done) {
        var metaData = {
            coverImage: {
                url: 'http://mysite.com/content/image/mypostcoverimage.jpg'
            },
            authorImage: {
                url: 'http://mysite.com/author/image/url/me.jpg'
            },
            ogImage: {
                url: 'http://mysite.com/content/image/super-facebook-image.jpg'
            },
            blog: {
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

        getImageDimensions.__set__('getCachedImageSizeFromUrl', sizeOfStub);

        getImageDimensions(metaData).then(function (result) {
            should.exist(result);
            sizeOfStub.calledWith(metaData.coverImage.url).should.be.true();
            sizeOfStub.calledWith(metaData.authorImage.url).should.be.true();
            sizeOfStub.calledWith(metaData.ogImage.url).should.be.true();
            sizeOfStub.calledWith(metaData.blog.logo.url).should.be.true();
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
            result.blog.logo.should.have.property('dimensions');
            result.blog.logo.should.have.property('url');
            result.blog.logo.dimensions.should.have.property('width', 50);
            result.blog.logo.dimensions.should.have.property('height', 50);
            done();
        }).catch(done);
    });

    it('should return metaData if url is undefined or null', function (done) {
        var metaData = {
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
            blog: {
                logo: {
                    url: 'noUrl'
                }
            }
        };

        sizeOfStub.returns({});

        getImageDimensions.__set__('getCachedImageSizeFromUrl', sizeOfStub);

        getImageDimensions(metaData).then(function (result) {
            should.exist(result);
            sizeOfStub.calledWith(metaData.coverImage.url).should.be.true();
            sizeOfStub.calledWith(metaData.authorImage.url).should.be.true();
            sizeOfStub.calledWith(metaData.ogImage.url).should.be.true();
            sizeOfStub.calledWith(metaData.blog.logo.url).should.be.true();
            result.coverImage.should.not.have.property('dimensions');
            result.coverImage.should.have.property('url');
            result.authorImage.should.not.have.property('dimensions');
            result.authorImage.should.have.property('url');
            result.ogImage.should.not.have.property('dimensions');
            result.ogImage.should.have.property('url');
            result.blog.logo.should.not.have.property('dimensions');
            result.blog.logo.should.have.property('url');
            done();
        }).catch(done);
    });

    it('should fake image dimension for publisher.logo if file is too big and square', function (done) {
        var metaData = {
            coverImage: {
                url: 'http://mysite.com/content/image/mypostcoverimage.jpg'
            },
            authorImage: {
                url: 'http://mysite.com/author/image/url/me.jpg'
            },
            ogImage: {
                url: 'http://mysite.com/content/image/super-facebook-image.jpg'
            },
            blog: {
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

        getImageDimensions.__set__('getCachedImageSizeFromUrl', sizeOfStub);

        getImageDimensions(metaData).then(function (result) {
            should.exist(result);
            sizeOfStub.calledWith(metaData.coverImage.url).should.be.true();
            sizeOfStub.calledWith(metaData.authorImage.url).should.be.true();
            sizeOfStub.calledWith(metaData.ogImage.url).should.be.true();
            sizeOfStub.calledWith(metaData.blog.logo.url).should.be.true();
            result.coverImage.should.have.property('url');
            result.coverImage.should.have.property('dimensions');
            result.coverImage.dimensions.should.have.property('height', 480);
            result.coverImage.dimensions.should.have.property('width', 480);
            result.blog.logo.should.have.property('url');
            result.blog.logo.should.have.property('dimensions');
            result.blog.logo.dimensions.should.have.property('height', 60);
            result.blog.logo.dimensions.should.have.property('width', 60);
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
        var metaData = {
            coverImage: {
                url: 'http://mysite.com/content/image/mypostcoverimage.jpg'
            },
            authorImage: {
                url: 'http://mysite.com/author/image/url/me.jpg'
            },
            ogImage: {
                url: 'http://mysite.com/content/image/super-facebook-image.jpg'
            },
            blog: {
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

        getImageDimensions.__set__('getCachedImageSizeFromUrl', sizeOfStub);

        getImageDimensions(metaData).then(function (result) {
            should.exist(result);
            sizeOfStub.calledWith(metaData.coverImage.url).should.be.true();
            sizeOfStub.calledWith(metaData.authorImage.url).should.be.true();
            sizeOfStub.calledWith(metaData.ogImage.url).should.be.true();
            sizeOfStub.calledWith(metaData.blog.logo.url).should.be.true();
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
            result.blog.logo.should.have.property('url');
            result.blog.logo.should.not.have.property('dimensions');
            done();
        }).catch(done);
    });
});
