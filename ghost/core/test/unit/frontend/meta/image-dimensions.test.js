const assert = require('node:assert/strict');
const {assertExists} = require('../../../utils/assertions');
const _ = require('lodash');
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
            assertExists(result);
            sinon.assert.calledWith(sizeOfStub, metaData.coverImage.url);
            sinon.assert.calledWith(sizeOfStub, metaData.authorImage.url);
            sinon.assert.calledWith(sizeOfStub, metaData.ogImage.url);
            sinon.assert.calledWith(sizeOfStub, metaData.site.logo.url);
            assert('dimensions' in result.coverImage);
            assert('url' in result.coverImage);
            assert.equal(result.coverImage.dimensions.width, 50);
            assert.equal(result.coverImage.dimensions.height, 50);
            assert('dimensions' in result.authorImage);
            assert('url' in result.authorImage);
            assert.equal(result.authorImage.dimensions.width, 50);
            assert.equal(result.authorImage.dimensions.height, 50);
            assert('dimensions' in result.ogImage);
            assert('url' in result.ogImage);
            assert.equal(result.ogImage.dimensions.width, 50);
            assert.equal(result.ogImage.dimensions.height, 50);
            assert('dimensions' in result.site.logo);
            assert('url' in result.site.logo);
            assert.equal(result.site.logo.dimensions.width, 50);
            assert.equal(result.site.logo.dimensions.height, 50);
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
            assertExists(result);
            sinon.assert.calledWith(sizeOfStub, metaData.coverImage.url);
            sinon.assert.calledWith(sizeOfStub, metaData.authorImage.url);
            sinon.assert.calledWith(sizeOfStub, metaData.ogImage.url);
            sinon.assert.calledWith(sizeOfStub, metaData.site.logo.url);
            assert(!('dimensions' in result.coverImage));
            assert('url' in result.coverImage);
            assert(!('dimensions' in result.authorImage));
            assert('url' in result.authorImage);
            assert(!('dimensions' in result.ogImage));
            assert('url' in result.ogImage);
            assert(!('dimensions' in result.site.logo));
            assert('url' in result.site.logo);
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
            assertExists(result);
            sinon.assert.calledWith(sizeOfStub, metaData.coverImage.url);
            sinon.assert.calledWith(sizeOfStub, metaData.authorImage.url);
            sinon.assert.calledWith(sizeOfStub, metaData.ogImage.url);
            sinon.assert.calledWith(sizeOfStub, metaData.site.logo.url);
            assert('url' in result.coverImage);
            assert('dimensions' in result.coverImage);
            assert.equal(result.coverImage.dimensions.height, 480);
            assert.equal(result.coverImage.dimensions.width, 480);
            assert('url' in result.site.logo);
            assert('dimensions' in result.site.logo);
            assert.equal(result.site.logo.dimensions.height, 60);
            assert.equal(result.site.logo.dimensions.width, 60);
            assert('url' in result.authorImage);
            assert('dimensions' in result.authorImage);
            assert.equal(result.authorImage.dimensions.height, 480);
            assert.equal(result.authorImage.dimensions.width, 480);
            assert('url' in result.ogImage);
            assert('dimensions' in result.ogImage);
            assert.equal(result.ogImage.dimensions.height, 480);
            assert.equal(result.ogImage.dimensions.width, 480);
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
            assertExists(result);
            sinon.assert.calledWith(sizeOfStub, metaData.coverImage.url);
            sinon.assert.calledWith(sizeOfStub, metaData.authorImage.url);
            sinon.assert.calledWith(sizeOfStub, metaData.ogImage.url);
            sinon.assert.calledWith(sizeOfStub, metaData.site.logo.url);
            assert('dimensions' in result.coverImage);
            assert('url' in result.coverImage);
            assert.equal(result.coverImage.dimensions.height, 480);
            assert.equal(result.coverImage.dimensions.width, 80);
            assert('dimensions' in result.authorImage);
            assert('url' in result.authorImage);
            assert.equal(result.authorImage.dimensions.height, 480);
            assert.equal(result.authorImage.dimensions.width, 80);
            assert('dimensions' in result.ogImage);
            assert('url' in result.ogImage);
            assert.equal(result.ogImage.dimensions.height, 480);
            assert.equal(result.ogImage.dimensions.width, 80);
            assert('url' in result.site.logo);
            assert(!('dimensions' in result.site.logo));
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
            assertExists(result);
            sinon.assert.calledWith(sizeOfStub, originalMetaData.coverImage.url);
            sinon.assert.calledWith(sizeOfStub, originalMetaData.authorImage.url);
            sinon.assert.calledWith(sizeOfStub, originalMetaData.ogImage.url);
            sinon.assert.calledWith(sizeOfStub, originalMetaData.twitterImage);
            sinon.assert.calledWith(sizeOfStub, originalMetaData.site.logo.url);
            assert('url' in result.coverImage);
            assert.equal(result.coverImage.url, 'http://mysite.com/content/images/size/w1200/mypostcoverimage.jpg');
            assert('dimensions' in result.coverImage);
            assert.equal(result.coverImage.dimensions.width, 1200);
            assert.equal(result.coverImage.dimensions.height, 720);
            assert('url' in result.authorImage);
            assert.equal(result.authorImage.url, 'http://mysite.com/content/images/size/w1200/me.jpg');
            assert('dimensions' in result.authorImage);
            assert.equal(result.authorImage.dimensions.width, 1200);
            assert.equal(result.authorImage.dimensions.height, 720);
            assert('url' in result.ogImage);
            assert.equal(result.ogImage.url, 'http://mysite.com/content/images/size/w1200/super-facebook-image.jpg');
            assert('dimensions' in result.ogImage);
            assert.equal(result.ogImage.dimensions.width, 1200);
            assert.equal(result.ogImage.dimensions.height, 720);
            assert.equal(result.twitterImage, 'http://mysite.com/content/images/size/w1200/super-twitter-image.jpg');
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
            assertExists(result);
            assert('url' in result.coverImage);
            assert.equal(result.coverImage.url, 'http://anothersite.com/some/storage/mypostcoverimage.jpg');
            assert('url' in result.authorImage);
            assert.equal(result.authorImage.url, 'http://anothersite.com/some/storage/me.jpg');
            assert('url' in result.ogImage);
            assert.equal(result.ogImage.url, 'http://anothersite.com/some/storage/super-facebook-image.jpg');
            assert('url' in result.site.logo);
            assert.equal(result.site.logo.url, 'http://anothersite.com/some/storage/logo.jpg');
            done();
        }).catch(done);
    });

    it('appends image size prefix to CDN-hosted content images', function (done) {
        const originalMetaData = {
            coverImage: {
                url: 'https://storage.ghost.is/c/6f/a3/site/content/images/2026/02/cover.jpg'
            },
            authorImage: {
                url: 'https://storage.ghost.is/c/6f/a3/site/content/images/2026/02/author.jpg'
            },
            ogImage: {
                url: 'https://storage.ghost.is/c/6f/a3/site/content/images/2026/02/og.jpg'
            },
            twitterImage: 'https://storage.ghost.is/c/6f/a3/site/content/images/2026/02/twitter.jpg',
            site: {
                logo: {
                    url: 'https://storage.ghost.is/c/6f/a3/site/content/images/2026/02/logo.jpg'
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
            assertExists(result);
            assert.equal(result.coverImage.url, 'https://storage.ghost.is/c/6f/a3/site/content/images/size/w1200/2026/02/cover.jpg');
            assert.equal(result.authorImage.url, 'https://storage.ghost.is/c/6f/a3/site/content/images/size/w1200/2026/02/author.jpg');
            assert.equal(result.ogImage.url, 'https://storage.ghost.is/c/6f/a3/site/content/images/size/w1200/2026/02/og.jpg');
            assert.equal(result.twitterImage, 'https://storage.ghost.is/c/6f/a3/site/content/images/size/w1200/2026/02/twitter.jpg');
            // logo dimensions are computed but logo URL is not resized in this path
            assert.equal(result.site.logo.url, originalMetaData.site.logo.url);
            done();
        }).catch(done);
    });
});
