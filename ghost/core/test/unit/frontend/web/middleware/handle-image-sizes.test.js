const assert = require('node:assert/strict');
const sinon = require('sinon');
const adapterManager = require('../../../../../core/server/services/adapter-manager').default;
const activeTheme = require('../../../../../core/frontend/services/theme-engine/active');
const handleImageSizes = require('../../../../../core/frontend/web/middleware/handle-image-sizes.js');
const {imageSize} = require('../../../../../core/server/lib/image');
const errors = require('@tryghost/errors');
const imageTransform = require('@tryghost/image-transform');
const {deferred} = require('../../../../utils/deferred')

const fakeResBase = {
    setHeader() {}
};

// @TODO make these tests lovely and non specific to implementation
describe('handleImageSizes middleware', function () {
    afterEach(function () {
        sinon.restore();
    });

    it('calls next immediately if the url does not match /size/something/', function () {
        const {promise, done} = deferred();
        const fakeReq = {
            url: '/size/something'
        };
        handleImageSizes(fakeReq, fakeResBase, function next() {
            done();
        });
        return promise;
    });

    it('calls next immediately if the url does not match /size/whatever/', function () {
        const {promise, done} = deferred();
        const fakeReq = {
            url: '/url/whatever/'
        };
        handleImageSizes(fakeReq, fakeResBase, function next() {
            done();
        });
        return promise;
    });

    it('calls next immediately if the file extension is missing', function () {
        const {promise, done} = deferred();
        const fakeReq = {
            url: '/size/something/file'
        };
        handleImageSizes(fakeReq, fakeResBase, function next() {
            done();
        });
        return promise;
    });

    it('calls next immediately if the file has a trailing slash', function () {
        const {promise, done} = deferred();
        const fakeReq = {
            url: '/size/something/file.jpg/'
        };
        handleImageSizes(fakeReq, fakeResBase, function next() {
            done();
        });
        return promise;
    });

    it('calls next immediately if the url does not match /size//', function () {
        const {promise, done} = deferred();
        const fakeReq = {
            url: '/size//'
        };
        handleImageSizes(fakeReq, fakeResBase, function next() {
            done();
        });
        return promise;
    });

    describe('file handling', function () {
        let dummyStorage;
        let dummyTheme;
        let resizeFromBufferStub;
        let buffer;

        beforeEach(function () {
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

            sinon.stub(adapterManager, 'getAdapter').returns(dummyStorage);
            // imageSize resolves the images storage adapter once at require time,
            // so stubbing adapterManager alone doesn't reach it
            sinon.stub(imageSize, 'imageStore').value(dummyStorage);
            sinon.stub(activeTheme, 'get').returns(dummyTheme);
            resizeFromBufferStub = sinon.stub(imageTransform, 'resizeFromBuffer').resolves(Buffer.from([]));
        });

        it('redirects for invalid format extension', function () {
            const {promise, done} = deferred();
            const fakeReq = {
                url: '/size/w1000/format/test/image.jpg',
                originalUrl: '/blog/content/images/size/w1000/format/test/image.jpg'
            };
            const fakeRes = {
                redirect(url) {
                    try {
                        assert.equal(url, '/blog/content/images/image.jpg');
                    } catch (e) {
                        return done(e);
                    }
                    done();
                },
                setHeader() {}
            };
            handleImageSizes(fakeReq, fakeRes, function next(err) {
                if (err) {
                    return done(err);
                }
                done(new Error('Should not have called next'));
            });
            return promise;
        });

        it('redirects for invalid sizes', function () {
            const {promise, done} = deferred();
            const fakeReq = {
                url: '/size/w123/image.jpg',
                originalUrl: '/blog/content/images/size/w123/image.jpg'
            };
            const fakeRes = {
                redirect(url) {
                    try {
                        assert.equal(url, '/blog/content/images/image.jpg');
                    } catch (e) {
                        return done(e);
                    }
                    done();
                },
                setHeader() {}
            };
            handleImageSizes(fakeReq, fakeRes, function next(err) {
                if (err) {
                    return done(err);
                }
                done(new Error('Should not have called next'));
            });
            return promise;
        });

        it('strips multiple leading slashes when redirecting to the original URL', function () {
            const {promise, done} = deferred();
            const fakeReq = {
                url: '/size/w123/image.jpg',
                originalUrl: '////example.com/content/images/size/w123/image.jpg'
            };
            const fakeRes = {
                redirect(url) {
                    try {
                        assert.equal(url, '/example.com/content/images/image.jpg');
                    } catch (e) {
                        return done(e);
                    }
                    done();
                },
                setHeader() {}
            };
            handleImageSizes(fakeReq, fakeRes, function next(err) {
                if (err) {
                    return done(err);
                }
                done(new Error('Should not have called next'));
            });
            return promise;
        });

        it('redirects for invalid configured size', function () {
            const {promise, done} = deferred();
            const fakeReq = {
                url: '/size/missing/image.jpg',
                originalUrl: '/blog/content/images/size/missing/image.jpg'
            };
            const fakeRes = {
                redirect(url) {
                    try {
                        assert.equal(url, '/blog/content/images/image.jpg');
                    } catch (e) {
                        return done(e);
                    }
                    done();
                },
                setHeader() {}
            };
            handleImageSizes(fakeReq, fakeRes, function next(err) {
                if (err) {
                    return done(err);
                }
                done(new Error('Should not have called next'));
            });
            return promise;
        });

        it('returns original URL if file is empty', function () {
            const {promise, done} = deferred();
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

            const fakeReq = {
                url: '/size/w1000/blank.png',
                originalUrl: '/blog/content/images/size/w1000/blank.png'
            };
            const fakeRes = {
                redirect(url) {
                    try {
                        assert.equal(url, '/blog/content/images/blank.png');
                    } catch (e) {
                        return done(e);
                    }
                    done();
                },
                setHeader() {}
            };

            handleImageSizes(fakeReq, fakeRes, function next(err) {
                if (err) {
                    return done(err);
                }
                done(new Error('Should not have called next'));
            });
            return promise;
        });

        it('returns original URL if unsupported storage adapter', function () {
            const {promise, done} = deferred();
            dummyStorage.saveRaw = undefined;

            const fakeReq = {
                url: '/size/w1000/blank.png',
                originalUrl: '/blog/content/images/size/w1000/blank.png'
            };
            const fakeRes = {
                redirect(url) {
                    try {
                        assert.equal(url, '/blog/content/images/blank.png');
                    } catch (e) {
                        return done(e);
                    }
                    done();
                },
                setHeader() {}
            };

            handleImageSizes(fakeReq, fakeRes, function next(err) {
                if (err) {
                    return done(err);
                }
                done(new Error('Should not have called next'));
            });
            return promise;
        });

        it('redirects if sharp is not installed', function () {
            const {promise, done} = deferred();
            sinon.stub(imageTransform, 'canTransformFiles').returns(false);

            const fakeReq = {
                url: '/size/w1000/blank.png',
                originalUrl: '/blog/content/images/size/w1000/blank.png'
            };
            const fakeRes = {
                redirect(url) {
                    try {
                        assert.equal(url, '/blog/content/images/blank.png');
                    } catch (e) {
                        return done(e);
                    }
                    done();
                },
                setHeader() {}
            };

            handleImageSizes(fakeReq, fakeRes, function next(err) {
                if (err) {
                    return done(err);
                }
                done(new Error('Should not have called next'));
            });
            return promise;
        });

        it('redirects if timeout is exceeded', function () {
            const {promise, done} = deferred();
            sinon.stub(imageTransform, 'canTransformFiles').returns(true);

            dummyStorage.exists = async function () {
                return false;
            };

            dummyStorage.read = async function () {
                return buffer;
            };

            const error = new Error('Resize timeout');
            error.code = 'IMAGE_PROCESSING';

            resizeFromBufferStub.throws(error);

            const fakeReq = {
                url: '/size/w1000/blank.png',
                originalUrl: '/blog/content/images/size/w1000/blank.png'
            };

            const fakeRes = {
                redirect(url) {
                    try {
                        assert.equal(url, '/blog/content/images/blank.png');
                    } catch (e) {
                        return done(e);
                    }
                    done();
                },
                setHeader() {}
            };

            handleImageSizes(fakeReq, fakeRes, function next(err) {
                if (err) {
                    return done(err);
                }
                done(new Error('Should not have called next'));
            });
            return promise;
        });

        it('continues if file exists', function () {
            const {promise, done} = deferred();
            dummyStorage.exists = async function (path) {
                if (path === '/size/w1000/blank.png') {
                    return true;
                }
            };

            const fakeReq = {
                url: '/size/w1000/blank.png',
                originalUrl: '/size/w1000/blank.png'
            };
            const fakeRes = {
                redirect() {
                    done(new Error('Should not have called redirect'));
                },
                setHeader() {}
            };

            handleImageSizes(fakeReq, fakeRes, function next(err) {
                if (err) {
                    return done(err);
                }
                done();
            });
            return promise;
        });

        it('uses unoptimizedImageExists if it exists', function () {
            const {promise, done} = deferred();
            dummyStorage.exists = async function (path) {
                if (path === '/blank_o.png') {
                    return true;
                }
            };
            const spy = sinon.spy(dummyStorage, 'read');

            const fakeReq = {
                url: '/size/h100/blank.png',
                originalUrl: '/size/h100/blank.png'
            };
            const fakeRes = {
                redirect() {
                    done(new Error('Should not have called redirect'));
                },
                setHeader() {}
            };

            handleImageSizes(fakeReq, fakeRes, function next(err) {
                if (err) {
                    return done(err);
                }
                try {
                    sinon.assert.calledOnceWithExactly(spy, {path: '/blank_o.png'});
                } catch (e) {
                    return done(e);
                }
                done();
            });
            return promise;
        });

        it('uses unoptimizedImageExists if it exists with formatting', function () {
            const {promise, done} = deferred();
            dummyStorage.exists = async function (path) {
                if (path === '/blank_o.png') {
                    return true;
                }
            };
            const spy = sinon.spy(dummyStorage, 'read');

            const fakeReq = {
                url: '/size/w1000/format/webp/blank.png',
                originalUrl: '/size/w1000/format/webp/blank.png'
            };
            const fakeRes = {
                redirect() {
                    done(new Error('Should not have called redirect'));
                },
                type: function () {},
                setHeader() {}
            };
            const typeStub = sinon.spy(fakeRes, 'type');

            handleImageSizes(fakeReq, fakeRes, function next(err) {
                if (err) {
                    return done(err);
                }
                try {
                    sinon.assert.calledOnceWithExactly(spy, {path: '/blank_o.png'});
                    sinon.assert.calledOnceWithExactly(typeStub, 'webp');
                } catch (e) {
                    return done(e);
                }
                done();
            });
            return promise;
        });

        it('skips SVG if not formatted', function () {
            const {promise, done} = deferred();
            dummyStorage.exists = async function () {
                return false;
            };

            const fakeReq = {
                url: '/size/w1000/blank.svg',
                originalUrl: '/blog/content/images/size/w1000/blank.svg'
            };
            const fakeRes = {
                redirect(url) {
                    try {
                        assert.equal(url, '/blog/content/images/blank.svg');
                    } catch (e) {
                        return done(e);
                    }
                    done();
                },
                setHeader() {}
            };

            handleImageSizes(fakeReq, fakeRes, function next(err) {
                if (err) {
                    return done(err);
                }
                done(new Error('Should not have called next'));
            });
            return promise;
        });

        it('skips formatting to ico', function () {
            const {promise, done} = deferred();
            dummyStorage.exists = async function () {
                return false;
            };

            const fakeReq = {
                url: '/size/w1000/format/ico/blank.png',
                originalUrl: '/blog/content/images/size/w1000/format/ico/blank.png'
            };
            const fakeRes = {
                redirect(url) {
                    try {
                        assert.equal(url, '/blog/content/images/blank.png');
                    } catch (e) {
                        return done(e);
                    }
                    done();
                },
                setHeader() {}
            };

            handleImageSizes(fakeReq, fakeRes, function next(err) {
                if (err) {
                    return done(err);
                }
                done(new Error('Should not have called next'));
            });
            return promise;
        });

        it('skips formatting from ico', function () {
            const {promise, done} = deferred();
            dummyStorage.exists = async function () {
                return false;
            };

            const fakeReq = {
                url: '/size/w1000/format/png/blank.ico',
                originalUrl: '/blog/content/images/size/w1000/format/png/blank.ico'
            };
            const fakeRes = {
                redirect(url) {
                    try {
                        assert.equal(url, '/blog/content/images/blank.ico');
                    } catch (e) {
                        return done(e);
                    }
                    done();
                },
                setHeader() {}
            };

            handleImageSizes(fakeReq, fakeRes, function next(err) {
                if (err) {
                    return done(err);
                }
                done(new Error('Should not have called next'));
            });
            return promise;
        });

        it('skips formatting to svg', function () {
            const {promise, done} = deferred();
            dummyStorage.exists = async function () {
                return false;
            };

            const fakeReq = {
                url: '/size/w1000/format/svg/blank.png',
                originalUrl: '/blog/content/images/size/w1000/format/svg/blank.png'
            };
            const fakeRes = {
                redirect(url) {
                    try {
                        assert.equal(url, '/blog/content/images/blank.png');
                    } catch (e) {
                        return done(e);
                    }
                    done();
                },
                setHeader() {}
            };

            handleImageSizes(fakeReq, fakeRes, function next(err) {
                if (err) {
                    return done(err);
                }
                done(new Error('Should not have called next'));
            });
            return promise;
        });

        it('doesn\'t skip SVGs if formatted to PNG', function () {
            const {promise, done} = deferred();
            dummyStorage.exists = async function () {
                return false;
            };

            const fakeReq = {
                url: '/size/w1000/format/png/blank.svg',
                originalUrl: '/size/w1000/format/png/blank.svg'
            };
            const fakeRes = {
                redirect() {
                    done(new Error('Should not have called redirect'));
                },
                setHeader() {},
                type: function () {}
            };
            const typeStub = sinon.spy(fakeRes, 'type');

            handleImageSizes(fakeReq, fakeRes, function next(err) {
                if (err) {
                    return done(err);
                }
                try {
                    sinon.assert.calledOnceWithExactly(resizeFromBufferStub, buffer, {
                        withoutEnlargement: false,
                        width: 1000,
                        format: 'png',
                        timeout: handleImageSizes.RESIZE_TIMEOUT_SECONDS
                    });
                    sinon.assert.calledOnceWithExactly(typeStub, 'png');
                } catch (e) {
                    return done(e);
                }
                done();
            });
            return promise;
        });

        it('can format PNG to WEBP', function () {
            const {promise, done} = deferred();
            dummyStorage.exists = async function () {
                return false;
            };
            dummyStorage.read = async function () {
                return buffer;
            };

            const fakeReq = {
                url: '/size/w1000/format/webp/blank.png',
                originalUrl: '/size/w1000/format/webp/blank.png'
            };
            const fakeRes = {
                redirect() {
                    done(new Error('Should not have called redirect'));
                },
                setHeader() {},
                type: function () {}
            };
            const typeStub = sinon.spy(fakeRes, 'type');

            handleImageSizes(fakeReq, fakeRes, function next(err) {
                if (err) {
                    return done(err);
                }
                try {
                    sinon.assert.calledOnceWithExactly(resizeFromBufferStub, buffer, {
                        withoutEnlargement: true,
                        width: 1000,
                        format: 'webp',
                        timeout: handleImageSizes.RESIZE_TIMEOUT_SECONDS
                    });
                    sinon.assert.calledOnceWithExactly(typeStub, 'webp');
                } catch (e) {
                    return done(e);
                }
                done();
            });
            return promise;
        });

        it('can format PNG to AVIF', function () {
            const {promise, done} = deferred();
            dummyStorage.exists = async function () {
                return false;
            };
            dummyStorage.read = async function () {
                return buffer;
            };

            const fakeReq = {
                url: '/size/w1000/format/avif/blank.png',
                originalUrl: '/size/w1000/format/avif/blank.png'
            };
            const fakeRes = {
                redirect() {
                    done(new Error('Should not have called redirect'));
                },
                setHeader() {},
                type: function () {}
            };
            const typeStub = sinon.spy(fakeRes, 'type');

            handleImageSizes(fakeReq, fakeRes, function next(err) {
                if (err) {
                    return done(err);
                }
                try {
                    sinon.assert.calledOnceWithExactly(resizeFromBufferStub, buffer, {
                        withoutEnlargement: true,
                        width: 1000,
                        format: 'avif',
                        timeout: handleImageSizes.RESIZE_TIMEOUT_SECONDS
                    });
                    sinon.assert.calledOnceWithExactly(typeStub, 'image/avif');
                } catch (e) {
                    return done(e);
                }
                done();
            });
            return promise;
        });

        it('can format GIF to WEBP', function () {
            const {promise, done} = deferred();
            dummyStorage.exists = async function () {
                return false;
            };
            dummyStorage.read = async function () {
                return buffer;
            };

            const fakeReq = {
                url: '/size/w1000/format/webp/blank.gif',
                originalUrl: '/size/w1000/format/webp/blank.gif'
            };
            const fakeRes = {
                redirect() {
                    done(new Error('Should not have called redirect'));
                },
                setHeader() {},
                type: function () {}
            };
            const typeStub = sinon.spy(fakeRes, 'type');

            handleImageSizes(fakeReq, fakeRes, function next(err) {
                if (err) {
                    return done(err);
                }
                try {
                    sinon.assert.calledOnceWithExactly(resizeFromBufferStub, buffer, {
                        withoutEnlargement: true,
                        width: 1000,
                        format: 'webp',
                        timeout: handleImageSizes.RESIZE_TIMEOUT_SECONDS
                    });
                    sinon.assert.calledOnceWithExactly(typeStub, 'webp');
                } catch (e) {
                    return done(e);
                }
                done();
            });
            return promise;
        });

        it('can format WEBP to GIF', function () {
            const {promise, done} = deferred();
            dummyStorage.exists = async function () {
                return false;
            };
            dummyStorage.read = async function () {
                return buffer;
            };

            const fakeReq = {
                url: '/size/w1000/format/gif/blank.webp',
                originalUrl: '/size/w1000/format/gif/blank.webp'
            };
            const fakeRes = {
                redirect() {
                    done(new Error('Should not have called redirect'));
                },
                setHeader() {},
                type: function () {}
            };
            const typeStub = sinon.spy(fakeRes, 'type');

            handleImageSizes(fakeReq, fakeRes, function next(err) {
                if (err) {
                    return done(err);
                }
                try {
                    sinon.assert.calledOnceWithExactly(resizeFromBufferStub, buffer, {
                        withoutEnlargement: true,
                        width: 1000,
                        format: 'gif',
                        timeout: handleImageSizes.RESIZE_TIMEOUT_SECONDS
                    });
                    sinon.assert.calledOnceWithExactly(typeStub, 'gif');
                } catch (e) {
                    return done(e);
                }
                done();
            });
            return promise;
        });

        it('goes to next middleware with no error if source and resized image 404', function () {
            const {promise, done} = deferred();
            dummyStorage.exists = async function () {
                return false;
            };
            dummyStorage.read = async function () {
                throw new errors.NotFoundError({
                    message: 'File not found'
                });
            };

            const fakeReq = {
                url: '/size/w1000/2020/02/test.png',
                originalUrl: '/2020/02/test.png'
            };

            const fakeRes = {
                redirect() {
                    done(new Error('Should not have called redirect'));
                },
                setHeader() {},
                type: function () {}
            };

            handleImageSizes(fakeReq, fakeRes, function next(err) {
                if (err) {
                    return done(err);
                }
                done();
            });
            return promise;
        });
    });
});
