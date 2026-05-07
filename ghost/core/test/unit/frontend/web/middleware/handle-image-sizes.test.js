const express = require('express');
const request = require('supertest');
const sinon = require('sinon');
const storage = require('../../../../../core/server/adapters/storage');
const activeTheme = require('../../../../../core/frontend/services/theme-engine/active');
const handleImageSizes = require('../../../../../core/frontend/web/middleware/handle-image-sizes.js');
const errors = require('@tryghost/errors');
const imageTransform = require('@tryghost/image-transform');

function createApp() {
    const app = express();

    app.use('/blog/content/images', handleImageSizes);
    app.use((_req, res) => {
        res.status(200).end();
    });
    app.use((err, _req, res, _next) => {
        void _next;
        res.status(500).json({message: err.message});
    });

    return app;
}

function requestImage(url) {
    return request(createApp()).get(`/blog/content/images${url}`);
}

// @TODO make these tests lovely and non specific to implementation
describe('handleImageSizes middleware', function () {
    this.afterEach(function () {
        sinon.restore();
    });

    it('calls next immediately if the url does not match /size/something/', async function () {
        await requestImage('/size/something')
            .expect(200)
            .expect('Access-Control-Allow-Origin', '*');
    });

    it('calls next immediately if the url does not match /size/whatever/', async function () {
        await requestImage('/url/whatever/')
            .expect(200)
            .expect('Access-Control-Allow-Origin', '*');
    });

    it('calls next immediately if the file extension is missing', async function () {
        await requestImage('/size/something/file')
            .expect(200)
            .expect('Access-Control-Allow-Origin', '*');
    });

    it('calls next immediately if the file has a trailing slash', async function () {
        await requestImage('/size/something/file.jpg/')
            .expect(200)
            .expect('Access-Control-Allow-Origin', '*');
    });

    it('calls next immediately if the url does not match /size//', async function () {
        await requestImage('/size//')
            .expect(200)
            .expect('Access-Control-Allow-Origin', '*');
    });

    describe('file handling', function () {
        let dummyStorage;
        let dummyTheme;
        let resizeFromBufferStub;
        let canTransformFilesStub;
        let buffer;

        this.beforeEach(function () {
            buffer = Buffer.from([0]);
            dummyStorage = {
                async exists() {
                    return true;
                },

                read() {
                    return buffer;
                },

                async saveRaw(_buf, url) {
                    return url;
                }
            };

            dummyTheme = {
                config(key) {
                    if (key === 'image_sizes') {
                        return {
                            l: {
                                width: 1000
                            },
                            m: {
                                width: 1000,
                                height: 200
                            },
                            n: {
                                height: 1000
                            },
                            h100: {
                                height: 100
                            },
                            missing: {}
                        };
                    }
                }
            };

            sinon.stub(storage, 'getStorage').returns(dummyStorage);
            sinon.stub(activeTheme, 'get').returns(dummyTheme);
            canTransformFilesStub = sinon.stub(imageTransform, 'canTransformFiles').returns(true);
            resizeFromBufferStub = sinon.stub(imageTransform, 'resizeFromBuffer').resolves(Buffer.from([]));
        });

        it('redirects for invalid format extension', async function () {
            await requestImage('/size/w1000/format/test/image.jpg')
                .expect(302)
                .expect('Location', '/blog/content/images/image.jpg');
        });

        it('redirects for invalid sizes', async function () {
            await requestImage('/size/w123/image.jpg')
                .expect(302)
                .expect('Location', '/blog/content/images/image.jpg');
        });

        it('redirects for invalid configured size', async function () {
            await requestImage('/size/missing/image.jpg')
                .expect(302)
                .expect('Location', '/blog/content/images/image.jpg');
        });

        it('returns original URL if file is empty', async function () {
            dummyStorage.exists = async function (path) {
                if (path === '/blank_o.png') {
                    return true;
                }
                if (path === '/size/w1000/blank.png') {
                    return false;
                }
            };
            dummyStorage.read = async function () {
                return Buffer.from([]);
            };

            await requestImage('/size/w1000/blank.png')
                .expect(302)
                .expect('Location', '/blog/content/images/blank.png');
        });

        it('returns original URL if unsupported storage adapter', async function () {
            dummyStorage.saveRaw = undefined;

            await requestImage('/size/w1000/blank.png')
                .expect(302)
                .expect('Location', '/blog/content/images/blank.png');
        });

        it('redirects if sharp is not installed', async function () {
            canTransformFilesStub.returns(false);

            await requestImage('/size/w1000/blank.png')
                .expect(302)
                .expect('Location', '/blog/content/images/blank.png');
        });

        it('redirects if timeout is exceeded', async function () {
            dummyStorage.exists = async function () {
                return false;
            };

            dummyStorage.read = async function () {
                return buffer;
            };

            const error = new Error('Resize timeout');
            error.code = 'IMAGE_PROCESSING';

            resizeFromBufferStub.throws(error);

            await requestImage('/size/w1000/blank.png')
                .expect(302)
                .expect('Location', '/blog/content/images/blank.png');
        });

        it('continues if file exists', async function () {
            dummyStorage.exists = async function (path) {
                if (path === '/size/w1000/blank.png') {
                    return true;
                }
            };

            await requestImage('/size/w1000/blank.png')
                .expect(200);
        });

        it('uses unoptimizedImageExists if it exists', async function () {
            dummyStorage.exists = async function (path) {
                if (path === '/blank_o.png') {
                    return true;
                }
            };
            const spy = sinon.spy(dummyStorage, 'read');

            await requestImage('/size/h100/blank.png')
                .expect(200);

            sinon.assert.calledOnceWithExactly(spy, {path: '/blank_o.png'});
        });

        it('uses unoptimizedImageExists if it exists with formatting', async function () {
            dummyStorage.exists = async function (path) {
                if (path === '/blank_o.png') {
                    return true;
                }
            };
            const spy = sinon.spy(dummyStorage, 'read');

            await requestImage('/size/w1000/format/webp/blank.png')
                .expect(200)
                .expect('Content-Type', /image\/webp/);

            sinon.assert.calledOnceWithExactly(spy, {path: '/blank_o.png'});
        });

        it('skips SVG if not formatted', async function () {
            dummyStorage.exists = async function () {
                return false;
            };

            await requestImage('/size/w1000/blank.svg')
                .expect(302)
                .expect('Location', '/blog/content/images/blank.svg');
        });

        it('skips formatting to ico', async function () {
            dummyStorage.exists = async function () {
                return false;
            };

            await requestImage('/size/w1000/format/ico/blank.png')
                .expect(302)
                .expect('Location', '/blog/content/images/blank.png');
        });

        it('skips formatting from ico', async function () {
            dummyStorage.exists = async function () {
                return false;
            };

            await requestImage('/size/w1000/format/png/blank.ico')
                .expect(302)
                .expect('Location', '/blog/content/images/blank.ico');
        });

        it('skips formatting to svg', async function () {
            dummyStorage.exists = async function () {
                return false;
            };

            await requestImage('/size/w1000/format/svg/blank.png')
                .expect(302)
                .expect('Location', '/blog/content/images/blank.png');
        });

        it('doesn\'t skip SVGs if formatted to PNG', async function () {
            dummyStorage.exists = async function () {
                return false;
            };

            await requestImage('/size/w1000/format/png/blank.svg')
                .expect(200)
                .expect('Content-Type', /image\/png/);

            sinon.assert.calledOnceWithExactly(resizeFromBufferStub, buffer, {
                withoutEnlargement: false,
                width: 1000,
                format: 'png',
                timeout: handleImageSizes.RESIZE_TIMEOUT_SECONDS
            });
        });

        it('can format PNG to WEBP', async function () {
            dummyStorage.exists = async function () {
                return false;
            };
            dummyStorage.read = async function () {
                return buffer;
            };

            await requestImage('/size/w1000/format/webp/blank.png')
                .expect(200)
                .expect('Content-Type', /image\/webp/);

            sinon.assert.calledOnceWithExactly(resizeFromBufferStub, buffer, {
                withoutEnlargement: true,
                width: 1000,
                format: 'webp',
                timeout: handleImageSizes.RESIZE_TIMEOUT_SECONDS
            });
        });

        it('can format PNG to AVIF', async function () {
            dummyStorage.exists = async function () {
                return false;
            };
            dummyStorage.read = async function () {
                return buffer;
            };

            await requestImage('/size/w1000/format/avif/blank.png')
                .expect(200)
                .expect('Content-Type', /image\/avif/);

            sinon.assert.calledOnceWithExactly(resizeFromBufferStub, buffer, {
                withoutEnlargement: true,
                width: 1000,
                format: 'avif',
                timeout: handleImageSizes.RESIZE_TIMEOUT_SECONDS
            });
        });

        it('can format GIF to WEBP', async function () {
            dummyStorage.exists = async function () {
                return false;
            };
            dummyStorage.read = async function () {
                return buffer;
            };

            await requestImage('/size/w1000/format/webp/blank.gif')
                .expect(200)
                .expect('Content-Type', /image\/webp/);

            sinon.assert.calledOnceWithExactly(resizeFromBufferStub, buffer, {
                withoutEnlargement: true,
                width: 1000,
                format: 'webp',
                timeout: handleImageSizes.RESIZE_TIMEOUT_SECONDS
            });
        });

        it('can format WEBP to GIF', async function () {
            dummyStorage.exists = async function () {
                return false;
            };
            dummyStorage.read = async function () {
                return buffer;
            };

            await requestImage('/size/w1000/format/gif/blank.webp')
                .expect(200)
                .expect('Content-Type', /image\/gif/);

            sinon.assert.calledOnceWithExactly(resizeFromBufferStub, buffer, {
                withoutEnlargement: true,
                width: 1000,
                format: 'gif',
                timeout: handleImageSizes.RESIZE_TIMEOUT_SECONDS
            });
        });

        it('goes to next middleware with no error if source and resized image 404', async function () {
            dummyStorage.exists = async function () {
                return false;
            };
            dummyStorage.read = async function () {
                throw new errors.NotFoundError({
                    message: 'File not found'
                });
            };

            await requestImage('/size/w1000/2020/02/test.png')
                .expect(200);
        });
    });
});
