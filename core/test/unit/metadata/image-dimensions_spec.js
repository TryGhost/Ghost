var should         = require('should'),
    sinon          = require('sinon'),
    rewire         = require('rewire'),

// Stuff we are testing
    getImageDimensions          = rewire('../../../server/data/meta/image-dimensions'),
    getCachedImageSizeFromUrl   = rewire('../../../server/utils/cached-image-size-from-url'),

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
            sizeOfStub.calledWith(metaData.blog.logo.url).should.be.true();
            result.coverImage.should.have.property('dimensions');
            result.coverImage.should.have.property('url');
            result.blog.logo.should.have.property('dimensions');
            result.blog.logo.should.have.property('url');
            result.authorImage.should.have.property('dimensions');
            result.authorImage.should.have.property('url');
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
            blog: {
                logo: {
                    url: 'noUrl'
                }
            }
        };

        sizeOfStub.returns({});

        getImageDimensions.__set__('getCachedImageSizeFromUrl', sizeOfStub);

        getImageDimensions(metaData).then(function (result) {
            console.log('result:', result);
            should.exist(result);
            sizeOfStub.calledWith(metaData.coverImage.url).should.be.true();
            sizeOfStub.calledWith(metaData.authorImage.url).should.be.true();
            sizeOfStub.calledWith(metaData.blog.logo.url).should.be.true();
            result.coverImage.should.not.have.property('dimensions');
            result.blog.logo.should.not.have.property('dimensions');
            result.authorImage.should.not.have.property('dimensions');
            result.coverImage.should.have.property('url');
            result.blog.logo.should.have.property('url');
            result.authorImage.should.have.property('url');
            done();
        }).catch(done);
    });

    it('should not return dimension for publisher.logo only if logo is too big', function (done) {
        var metaData = {
            coverImage: {
                url: 'http://mysite.com/content/image/mypostcoverimage.jpg'
            },
            authorImage: {
                url: 'http://mysite.com/author/image/url/me.jpg'
            },
            blog: {
                logo: {
                    url: 'http://mysite.com/author/image/url/logo.jpg'
                }
            }
        };

        sizeOfStub.returns({
            width: 480,
            height: 80,
            type: 'jpg'
        });

        getImageDimensions.__set__('getCachedImageSizeFromUrl', sizeOfStub);

        getImageDimensions(metaData).then(function (result) {
            should.exist(result);
            sizeOfStub.calledWith(metaData.coverImage.url).should.be.true();
            sizeOfStub.calledWith(metaData.authorImage.url).should.be.true();
            sizeOfStub.calledWith(metaData.blog.logo.url).should.be.true();
            result.coverImage.should.have.property('dimensions');
            result.blog.logo.should.not.have.property('dimensions');
            result.authorImage.should.have.property('dimensions');
            result.coverImage.should.have.property('url');
            result.blog.logo.should.have.property('url');
            result.authorImage.should.have.property('url');
            done();
        }).catch(done);
    });
});
