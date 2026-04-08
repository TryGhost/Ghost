const assert = require('node:assert/strict');
const {assertExists} = require('../../../../utils/assertions');
const sinon = require('sinon');
const nock = require('nock');
const path = require('path');
const errors = require('@tryghost/errors');
const fs = require('fs');
const ImageSize = require('../../../../../core/server/lib/image/image-size');
const LocalStorageBase = require('../../../../../core/server/adapters/storage/LocalStorageBase');
const probe = require('probe-image-size');

// use a 1x1 gif in nock responses because it's really small and easy to work with
const GIF1x1 = Buffer.from('R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==', 'base64');
const FIXTURE_IMAGES_PATH = path.join(__dirname, '../../../../utils/fixtures/images/');

function createImageSize(overrides = {}) {
    const {
        config = {},
        tpl = {},
        storage = {},
        storageUtils = {isLocalImage: () => false},
        validator = {isURL: () => true},
        urlUtils = {},
        request = {},
        probe: probeOverride = probe
    } = overrides;

    return new ImageSize({
        config: {
            get: () => {},
            ...config
        },
        tpl,
        storage,
        storageUtils,
        validator,
        urlUtils,
        request,
        probe: probeOverride
    });
}

function createLocalUrlUtils(imageUrl, subdir = '') {
    const urlFor = sinon.stub();
    urlFor.withArgs('image').returns(imageUrl);
    urlFor.withArgs('home').returns('http://myblog.com/');

    return {
        urlFor,
        getSubdir: sinon.stub().returns(subdir)
    };
}

function createFixtureStorage() {
    return {
        getStorage: () => ({
            read: obj => fs.promises.readFile(obj.path)
        })
    };
}

function createFixtureStorageUtils(storagePath = FIXTURE_IMAGES_PATH) {
    return {
        isLocalImage: () => true,
        getLocalImagesStoragePath: imageUrl => path.join(storagePath, imageUrl.replace(/.*\//, ''))
    };
}

function assertImageObject(res, expectedImageObject) {
    assertExists(res);
    assert.equal(res.width, expectedImageObject.width);
    assert.equal(res.height, expectedImageObject.height);
    assert.equal(res.url, expectedImageObject.url);
}

describe('lib/image: image size', function () {
    afterEach(function () {
        sinon.restore();
        nock.cleanAll();
    });

    it('[success] should have an image size function', function () {
        const imageSize = createImageSize();
        assertExists(imageSize.getImageSizeFromUrl);
        assertExists(imageSize.getImageSizeFromStoragePath);
    });

    describe('getImageSizeFromUrl', function () {
        it('[success] should return image dimensions from probe request for probe-supported extension', function (done) {
            const url = 'http://img.stockfresh.com/files/f/feedough/x/11/1540353_20925115.jpg';
            const expectedImageObject = {
                height: 1,
                url: 'http://img.stockfresh.com/files/f/feedough/x/11/1540353_20925115.jpg',
                width: 1
            };

            const requestMock = nock('http://img.stockfresh.com')
                .get('/files/f/feedough/x/11/1540353_20925115.jpg')
                .reply(200, GIF1x1);

            const imageSize = createImageSize();

            imageSize.getImageSizeFromUrl(url).then(function (res) {
                assert.equal(requestMock.isDone(), true);
                assertExists(res);
                assert.equal(res.width, expectedImageObject.width);
                assert.equal(res.height, expectedImageObject.height);
                assert.equal(res.url, expectedImageObject.url);
                done();
            }).catch(done);
        });

        it('[success] should return image dimensions from fetch request for non-probe-supported extension', function (done) {
            const url = 'https://static.wixstatic.com/media/355241_d31358572a2542c5a44738ddcb59e7ea.cur';
            const expectedImageObject = {
                height: 1,
                url: 'https://static.wixstatic.com/media/355241_d31358572a2542c5a44738ddcb59e7ea.cur',
                width: 1
            };

            const requestMock = nock('https://static.wixstatic.com').get('/random-path').reply(404);

            const imageSize = createImageSize({
                request: (requestUrl) => {
                    if (requestUrl === url) {
                        return Promise.resolve({body: GIF1x1});
                    }
                    return Promise.reject();
                }
            });

            imageSize.getImageSizeFromUrl(url).then(function (res) {
                assert.equal(requestMock.isDone(), false);
                assertExists(res);
                assert.equal(res.width, expectedImageObject.width);
                assert.equal(res.height, expectedImageObject.height);
                assert.equal(res.url, expectedImageObject.url);
                done();
            }).catch(done);
        });

        it('[success] should return image dimensions when no image extension given', function (done) {
            const url = 'https://www.zomato.com/logo/18163505/minilogo';
            const expectedImageObject = {
                height: 1,
                url: 'https://www.zomato.com/logo/18163505/minilogo',
                width: 1
            };

            const requestMock = nock('https://www.zomato.com')
                .get('/logo/18163505/minilogo')
                .reply(200, GIF1x1);

            const imageSize = createImageSize();

            imageSize.getImageSizeFromUrl(url).then(function (res) {
                assert.equal(requestMock.isDone(), true);
                assertExists(res);
                assert.equal(res.width, expectedImageObject.width);
                assert.equal(res.height, expectedImageObject.height);
                assert.equal(res.url, expectedImageObject.url);
                done();
            }).catch(done);
        });

        it('[success] should returns largest image value for .ico files', function (done) {
            const url = 'https://super-website.com/media/icon.ico';
            const expectedImageObject = {
                height: 64,
                url: 'https://super-website.com/media/icon.ico',
                width: 64
            };

            const requestMock = nock('https://super-website.com')
                .get('/media/icon.ico')
                .replyWithFile(200, path.join(__dirname, '../../../../utils/fixtures/images/favicon_multi_sizes.ico'));
            const requestMockNotFound = nock('https://super-website.com').get('/random-path').reply(404);

            const imageSize = createImageSize();

            imageSize.getImageSizeFromUrl(url).then(function (res) {
                assert.equal(requestMockNotFound.isDone(), false);
                assert.equal(requestMock.isDone(), true);
                assertExists(res);
                assert.equal(res.width, expectedImageObject.width);
                assert.equal(res.height, expectedImageObject.height);
                assert.equal(res.url, expectedImageObject.url);
                done();
            }).catch(done);
        });

        it('[success] should return image dimensions asset path images', function (done) {
            const url = '/assets/img/logo.png?v=d30c3d1e41';
            const expectedImageObject = {
                height: 1,
                url: 'http://myblog.com/assets/img/logo.png?v=d30c3d1e41',
                width: 1
            };

            const urlForStub = sinon.stub().withArgs('home').returns('http://myblog.com/');
            const urlGetSubdirStub = sinon.stub().returns('');

            const requestMock = nock('http://myblog.com')
                .get('/assets/img/logo.png?v=d30c3d1e41')
                .reply(200, GIF1x1);

            const imageSize = createImageSize({
                urlUtils: {
                    urlFor: urlForStub,
                    getSubdir: urlGetSubdirStub,
                    urlJoin: function () {
                        if ([...arguments].join('') === 'http://myblog.com///assets/img/logo.png?v=d30c3d1e41') {
                            return expectedImageObject.url;
                        }
                        return '';
                    }
                },
                request: (requestUrl) => {
                    if (requestUrl === url) {
                        return Promise.resolve({body: GIF1x1});
                    }
                    return Promise.reject();
                }
            });

            imageSize.getImageSizeFromUrl(url).then(function (res) {
                assert.equal(requestMock.isDone(), true);
                assertExists(res);
                assert.equal(res.width, expectedImageObject.width);
                assert.equal(res.height, expectedImageObject.height);
                assert.equal(res.url, expectedImageObject.url);
                done();
            }).catch(done);
        });

        it('[success] should return image dimensions for gravatar images request', function (done) {
            const url = '//www.gravatar.com/avatar/ef6dcde5c99bb8f685dd451ccc3e050a?s=250&d=mm&r=x';
            const expectedImageObject = {
                height: 1,
                url: '//www.gravatar.com/avatar/ef6dcde5c99bb8f685dd451ccc3e050a?s=250&d=mm&r=x',
                width: 1
            };

            const requestMock = nock('http://www.gravatar.com')
                .get('/avatar/ef6dcde5c99bb8f685dd451ccc3e050a?s=250&d=mm&r=x')
                .reply(200, GIF1x1);

            const imageSize = createImageSize();

            imageSize.getImageSizeFromUrl(url).then(function (res) {
                assert.equal(requestMock.isDone(), true);
                assertExists(res);
                assert.equal(res.width, expectedImageObject.width);
                assert.equal(res.height, expectedImageObject.height);
                assert.equal(res.url, expectedImageObject.url);
                done();
            }).catch(done);
        });

        it('[success] can handle redirect (probe-image-size)', function (done) {
            const url = 'http://noimagehere.com/files/f/feedough/x/11/1540353_20925115.jpg';
            const expectedImageObject = {
                height: 1,
                url: 'http://noimagehere.com/files/f/feedough/x/11/1540353_20925115.jpg',
                width: 1
            };

            const requestMock = nock('http://noimagehere.com')
                .get('/files/f/feedough/x/11/1540353_20925115.jpg')
                .reply(301, null, {
                    location: 'http://someredirectedurl.com/files/f/feedough/x/11/1540353_20925115.jpg'
                });

            const secondRequestMock = nock('http://someredirectedurl.com')
                .get('/files/f/feedough/x/11/1540353_20925115.jpg')
                .reply(200, GIF1x1);

            const imageSize = createImageSize();

            imageSize.getImageSizeFromUrl(url).then(function (res) {
                assert.equal(requestMock.isDone(), true);
                assert.equal(secondRequestMock.isDone(), true);
                assertExists(res);
                assert.equal(res.width, expectedImageObject.width);
                assert.equal(res.height, expectedImageObject.height);
                assert.equal(res.url, expectedImageObject.url);
                done();
            }).catch(done);
        });

        it('[success] should switch to local file storage if available', function (done) {
            const url = '/content/images/favicon.png';
            const expectedImageObject = {
                height: 100,
                url: 'http://myblog.com/content/images/favicon.png',
                width: 100
            };

            const storagePath = path.join(__dirname, '../../../../utils/fixtures/images/');
            const urlForStub = sinon.stub();
            urlForStub.withArgs('image').returns('http://myblog.com/content/images/favicon.png');
            urlForStub.withArgs('home').returns('http://myblog.com/');
            const urlGetSubdirStub = sinon.stub();
            urlGetSubdirStub.returns('');

            const requestMock = nock('http://myblog.com')
                .get('/content/images/favicon.png')
                .reply(200, {
                    body: '<Buffer 2c be a4 40 f7 87 73 1e 57 2c c1 e4 0d 79 03 95 42 f0 42 2e 41 95 27 c9 5c 35 a7 71 2c 09 5a 57 d3 04 1e 83 03 28 07 96 b0 c8 88 65 07 7a d1 d6 63 50>'
                });

            const imageSize = createImageSize({
                storage: {
                    getStorage: () => ({
                        read: obj => fs.promises.readFile(obj.path)
                    })
                },
                storageUtils: {
                    isLocalImage: () => true,
                    getLocalImagesStoragePath: imageUrl => path.join(storagePath, imageUrl.replace(/.*\//, ''))
                },
                urlUtils: {
                    urlFor: urlForStub,
                    getSubdir: urlGetSubdirStub
                }
            });

            imageSize.getImageSizeFromUrl(url).then(function (res) {
                assert.equal(requestMock.isDone(), false);
                assertExists(res);
                assertExists(res.width);
                assert.equal(res.width, expectedImageObject.width);
                assertExists(res.height);
                assert.equal(res.height, expectedImageObject.height);
                assertExists(res.url);
                assert.equal(res.url, expectedImageObject.url);
                done();
            }).catch(done);
        });

        it('should use storage for local URL and HTTP for CDN URL', async function () {
            const localImageUrl = 'https://site.com/content/images/image.jpg';
            const cdnImageUrl = 'https://cdn.com/uuid/content/images/image.jpg';
            const expectedLocalDimensions = {width: 100, height: 100};
            const fixturePath = path.join(__dirname, '../../../../utils/fixtures/images/favicon.png');

            const cdnRequestMock = nock('https://cdn.com')
                .get('/uuid/content/images/image.jpg')
                .reply(200, GIF1x1);

            const storageReadSpy = sinon.spy(() => {
                return fs.promises.readFile(fixturePath);
            });

            const imageSize = createImageSize({
                storage: {
                    getStorage: () => ({
                        read: storageReadSpy
                    })
                },
                storageUtils: {
                    isLocalImage: imagePath => imagePath === localImageUrl,
                    getLocalImagesStoragePath: () => 'ignored-by-test'
                },
                urlUtils: {
                    urlFor: sinon.stub().withArgs('image').returns(localImageUrl),
                    getSubdir: sinon.stub().returns('')
                }
            });

            const localResult = await imageSize.getImageSizeFromUrl(localImageUrl);
            assert.equal(localResult.url, localImageUrl);
            assert.equal(localResult.width, expectedLocalDimensions.width);
            assert.equal(localResult.height, expectedLocalDimensions.height);
            sinon.assert.calledOnce(storageReadSpy);

            const cdnResult = await imageSize.getImageSizeFromUrl(cdnImageUrl);
            assert.equal(cdnResult.url, cdnImageUrl);
            assert.equal(cdnRequestMock.isDone(), true);
            sinon.assert.calledOnce(storageReadSpy);
        });

        it('[failure] can handle an error with statuscode not 200 (probe-image-size)', function (done) {
            const url = 'http://noimagehere.com/files/f/feedough/x/11/1540353_20925115.jpg';

            const requestMock = nock('http://noimagehere.com')
                .get('/files/f/feedough/x/11/1540353_20925115.jpg')
                .reply(404);

            const imageSize = createImageSize();

            imageSize.getImageSizeFromUrl(url)
                .catch(function (err) {
                    assert.equal(requestMock.isDone(), true);
                    assertExists(err);
                    assert.equal(err.errorType, 'NotFoundError');
                    assert.equal(err.message, 'Image not found.');
                    done();
                }).catch(done);
        });

        it('[failure] can handle an error with statuscode not 200 (image-size)', function (done) {
            const url = 'http://noimagehere.com/files/f/feedough/x/11/1540353_20925115.cur';

            const requestMock = nock('http://noimagehere.com')
                .get('/files/f/feedough/x/11/1540353_20925115.cur')
                .reply(404);

            class NotFound extends Error {
                constructor(message) {
                    super(message);
                    this.code = 'ENOENT';
                    this.statusCode = 404;
                }
            }

            const imageSize = createImageSize({
                request: (requestUrl) => {
                    if (requestUrl === url) {
                        return Promise.reject(new NotFound());
                    }
                    return Promise.reject();
                }
            });

            imageSize.getImageSizeFromUrl(url)
                .catch(function (err) {
                    assert.equal(requestMock.isDone(), false);
                    assertExists(err);
                    assert.equal(err.errorType, 'NotFoundError');
                    assert.equal(err.message, 'Image not found.');
                    done();
                }).catch(done);
        });

        it('[failure] handles invalid URL', function (done) {
            const url = 'Not-a-valid-url';

            const imageSize = createImageSize({
                validator: {isURL: () => false}
            });

            imageSize.getImageSizeFromUrl(url)
                .catch(function (err) {
                    assertExists(err);
                    assert.equal(err.errorType, 'InternalServerError');
                    assert.equal(err.message, 'URL empty or invalid.');
                    done();
                }).catch(done);
        });

        it('[failure] will handle responses timing out', function (done) {
            const url = 'https://static.wixstatic.com/media/355241_d31358572a2542c5a44738ddcb59e7ea.jpg_256';

            const requestMock = nock('https://static.wixstatic.com')
                .get('/media/355241_d31358572a2542c5a44738ddcb59e7ea.jpg_256')
                .delayConnection(10)
                .reply(408);

            const imageSize = createImageSize({
                config: {
                    get: (key) => {
                        if (key === 'times:getImageSizeTimeoutInMS') {
                            return 50;
                        }
                    }
                },
                probe(reqUrl, options) {
                    // simulate probe the request timing out by probe's option
                    return probe(reqUrl, {...options, response_timeout: 1});
                }
            });

            imageSize.getImageSizeFromUrl(url)
                .catch(function (err) {
                    assert.equal(requestMock.isDone(), true);
                    assertExists(err);
                    assert.equal(err.errorType, 'InternalServerError');
                    assert.equal(err.message, 'Request timed out.');
                    done();
                }).catch(done);
        });

        it('[failure] returns error if \`probe-image-size`\ module throws error', function (done) {
            const url = 'https://static.wixstatic.com/media/355241_d31358572a2542c5a44738ddcb59e7ea.jpg';

            const requestMock = nock('https://static.wixstatic.com')
                .get('/media/355241_d31358572a2542c5a44738ddcb59e7ea.jpg')
                .reply(200, Buffer.from('FFD8 FFC0 0004 00112233 FFD9'.replace(/ /g, ''), 'hex'));

            const imageSize = createImageSize();

            imageSize.getImageSizeFromUrl(url)
                .then(() => {
                    assert.equal(true, false, 'succeeded when expecting failure');
                })
                .catch(function (err) {
                    assert.equal(requestMock.isDone(), true);
                    assertExists(err);
                    assert.equal(err.errorType, 'InternalServerError');
                    done();
                }).catch(done);
        });

        it('[failure] returns error if \`image-size`\ module throws error', function (done) {
            const url = 'https://static.wixstatic.com/media/355241_d31358572a2542c5a44738ddcb59e7ea.cur';

            const requestMock = nock('https://static.wixstatic.com')
                .get('/media/nope.cur')
                .reply(404);

            const imageSize = createImageSize({
                request: (requestUrl) => {
                    if (requestUrl === url) {
                        return Promise.resolve({
                            body: Buffer.from('2c be a4 40 f7 87 73 1e 57 2c c1 e4 0d 79 03 95 42 f0 42 2e 41 95 27 c9 5c 35 a7 71 2c 09 5a 57 d3 04 1e 83 03 28 07 96 b0 c8 88 65 07 7a d1 d6 63 50'.replace(/ /g, ''), 'hex')
                        });
                    }
                    return Promise.reject();
                }
            });

            imageSize.getImageSizeFromUrl(url)
                .then(() => {
                    assert.equal(true, false, 'succeeded when expecting failure');
                })
                .catch(function (err) {
                    assert.equal(requestMock.isDone(), false);
                    assertExists(err);
                    assert.equal(err.errorType, 'InternalServerError');
                    done();
                }).catch(done);
        });

        it('[failure] returns error if request errors', function (done) {
            const url = 'https://notarealwebsite.com/images/notapicture.dds';

            const imageSize = createImageSize({
                request: () => Promise.reject({})
            });

            imageSize.getImageSizeFromUrl(url)
                .catch(function (err) {
                    assertExists(err);
                    assert.equal(err.errorType, 'InternalServerError');
                    assert.equal(err.message, 'Unknown Request error.');
                    done();
                }).catch(done);
        });

        it('[failure] handles probe being unresponsive', function (done) {
            const url = 'http://img.stockfresh.com/files/f/feedough/x/11/1540353_20925115.jpg';
            const requestMock = nock('http://img.stockfresh.com')
                .get('/files/f/feedough/x/11/1540353_20925115.jpg')
                .reply(200, GIF1x1);

            const imageSize = createImageSize({
                config: {
                    get: (key) => {
                        if (key === 'times:getImageSizeTimeoutInMS') {
                            return 1;
                        }
                    }
                },
                probe(reqUrl, options) {
                    // simulate probe being unresponsive by making the timeout longer than the request
                    return probe(reqUrl, {...options, response_timeout: 50});
                }
            });

            imageSize.getImageSizeFromUrl(url)
                .catch(function (err) {
                    assert.equal(requestMock.isDone(), true);
                    assertExists(err);
                    assert.equal(err.errorType, 'InternalServerError');
                    assert.equal(err.message, 'Probe unresponsive.');
                    done();
                }).catch(done);
        });
    });

    describe('getImageSizeFromStoragePath', function () {
        it('[success] should return image dimensions for locally stored images', function (done) {
            const url = '/content/images/ghost-logo.png';
            const expectedImageObject = {
                height: 257,
                url: 'http://myblog.com/content/images/ghost-logo.png',
                width: 800
            };

            const imageSize = createImageSize({
                storage: createFixtureStorage(),
                storageUtils: createFixtureStorageUtils(),
                urlUtils: createLocalUrlUtils(expectedImageObject.url),
                request: () => Promise.reject(new Error('request should not be used'))
            });

            imageSize.getImageSizeFromStoragePath(url).then(function (res) {
                assertImageObject(res, expectedImageObject);
                done();
            }).catch(done);
        });

        it('[success] should return image dimensions for locally stored images with subdirectory', function (done) {
            const url = '/content/images/favicon_too_large.png';
            const expectedImageObject = {
                height: 1010,
                url: 'http://myblog.com/blog/content/images/favicon_too_large.png',
                width: 1010
            };

            const imageSize = createImageSize({
                storage: createFixtureStorage(),
                storageUtils: createFixtureStorageUtils(),
                urlUtils: createLocalUrlUtils(expectedImageObject.url, '/blog'),
                request: () => Promise.reject(new Error('request should not be used'))
            });

            imageSize.getImageSizeFromStoragePath(url).then(function (res) {
                assertImageObject(res, expectedImageObject);
                done();
            }).catch(done);
        });

        it('[success] should return largest image dimensions for locally stored .ico image', function (done) {
            const url = 'http://myblog.com/content/images/favicon_multi_sizes.ico';
            const expectedImageObject = {
                height: 64,
                url: 'http://myblog.com/content/images/favicon_multi_sizes.ico',
                width: 64
            };

            const imageSize = createImageSize({
                storage: createFixtureStorage(),
                storageUtils: createFixtureStorageUtils(),
                urlUtils: createLocalUrlUtils(expectedImageObject.url),
                request: () => Promise.reject(new Error('request should not be used'))
            });

            imageSize.getImageSizeFromStoragePath(url).then(function (res) {
                assertImageObject(res, expectedImageObject);
                done();
            }).catch(done);
        });

        it('[success] should return image dimensions for locally stored .webp image', function (done) {
            const url = 'http://myblog.com/content/images/ghosticon.webp';
            const expectedImageObject = {
                height: 249,
                url: 'http://myblog.com/content/images/ghosticon.webp',
                width: 249
            };

            const imageSize = createImageSize({
                storage: createFixtureStorage(),
                storageUtils: createFixtureStorageUtils(),
                urlUtils: createLocalUrlUtils(expectedImageObject.url),
                request: () => Promise.reject(new Error('request should not be used'))
            });

            imageSize.getImageSizeFromStoragePath(url).then(function (res) {
                assertImageObject(res, expectedImageObject);
                done();
            }).catch(done);
        });

        it('[failure] returns error if storage adapter errors', function (done) {
            const url = '/content/images/not-existing-image.png';

            const imageSize = createImageSize({storage: {
                getStorage: () => ({
                    read: () => {
                        return Promise.reject(new errors.NotFoundError());
                    }
                })
            }, storageUtils: createFixtureStorageUtils(), urlUtils: createLocalUrlUtils('http://myblog.com/content/images/not-existing-image.png'), request: () => Promise.reject(new Error('request should not be used'))});

            imageSize.getImageSizeFromStoragePath(url)
                .catch(function (err) {
                    assertExists(err);
                    assert.equal((err instanceof errors.NotFoundError), true);
                    done();
                }).catch(done);
        });

        it('[failure] rejects traversal outside the image storage root', async function () {
            const url = '/content/images/../../../../../outside-root.png';
            const imageStorage = new LocalStorageBase({
                storagePath: path.join(__dirname, '../../../../utils/fixtures/images/'),
                staticFileURLPrefix: 'content/images',
                siteUrl: 'http://myblog.com/'
            });

            const imageSize = createImageSize({storage: {
                getStorage: () => imageStorage
            }, storageUtils: {
                isLocalImage: () => true,
                getLocalImagesStoragePath: imageUrl => imageUrl.replace('http://myblog.com/content/images', '')
            }, validator: {}, urlUtils: {
                urlFor: () => 'http://myblog.com/content/images/../../../../../outside-root.png',
                getSubdir: () => ''
            }, request: () => {
                return Promise.reject({});
            }});

            await assert.rejects(
                imageSize.getImageSizeFromStoragePath(url),
                {message: 'The path "/../../../../../outside-root.png" is not valid for this storage.'}
            );
        });

        it('[failure] returns error if \`image-size`\ module throws error', function (done) {
            const url = '/content/images/malformed.svg';

            const imageSize = createImageSize({storage: {
                getStorage: () => ({
                    read: () => {
                        return Promise.resolve(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg viewBox="0 0 100 100>/svg>'));
                    }
                })
            }, storageUtils: {
                isLocalImage: () => true,
                getLocalImagesStoragePath: () => ''
            }, validator: {}, urlUtils: {
                ...createLocalUrlUtils('http://myblog.com/content/images/malformed.svg')
            }, request: () => {
                return Promise.reject({});
            }});

            imageSize.getImageSizeFromStoragePath(url)
                .catch(function (err) {
                    assertExists(err);
                    done();
                }).catch(done);
        });
    });
});
