const should = require('should');
const sinon = require('sinon');
const storage = require('../../../../../core/server/adapters/storage');
const activeTheme = require('../../../../../core/frontend/services/theme-engine/active');
const handleImageSizes = require('../../../../../core/frontend/web/middleware/handle-image-sizes.js');
const imageTransform = require('@tryghost/image-transform');

// @TODO make these tests lovely and non specific to implementation
describe('handleImageSizes middleware', function () {
    it('calls next immediately if the url does not match /size/something/', function (done) {
        const fakeReq = {
            url: '/size/something'
        };
        // CASE: second thing middleware does is try to match to a regex
        fakeReq.url.match = function () {
            throw new Error('Should have exited immediately');
        };
        handleImageSizes(fakeReq, {}, function next() {
            done();
        });
    });

    it('calls next immediately if the url does not match /size/something/', function (done) {
        const fakeReq = {
            url: '/url/whatever/'
        };
        // CASE: second thing middleware does is try to match to a regex
        fakeReq.url.match = function () {
            throw new Error('Should have exited immediately');
        };
        handleImageSizes(fakeReq, {}, function next() {
            done();
        });
    });

    it('calls next immediately if the url does not match /size/something/', function (done) {
        const fakeReq = {
            url: '/size//'
        };
        // CASE: second thing middleware does is try to match to a regex
        fakeReq.url.match = function () {
            throw new Error('Should have exited immediately');
        };
        handleImageSizes(fakeReq, {}, function next() {
            done();
        });
    });

    describe('file handling', function () {
        let dummyStorage;
        let dummyTheme;
        let resizeFromBufferStub;
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

                async saveRaw(buf, url) {
                    return url;
                }
            };

            dummyTheme = {
                config(key) {
                    if (key === 'image_sizes') {
                        return {
                            l: {
                                width: 1000
                            }
                        };
                    }
                }
            };

            sinon.stub(storage, 'getStorage').returns(dummyStorage);
            sinon.stub(activeTheme, 'get').returns(dummyTheme);
            resizeFromBufferStub = sinon.stub(imageTransform, 'resizeFromBuffer').resolves(Buffer.from([]));
        });

        this.afterEach(function () {
            sinon.restore();
        });

        it('redirects for invalid format extension', function (done) {
            const fakeReq = {
                url: '/size/w1000/format/test/image.jpg',
                originalUrl: '/blog/content/images/size/w1000/format/test/image.jpg'
            };
            const fakeRes = {
                redirect(url) {
                    try {
                        url.should.equal('/blog/content/images/image.jpg');
                    } catch (e) {
                        return done(e);
                    }                    
                    done();
                }
            };
            handleImageSizes(fakeReq, fakeRes, function next(err) {
                if (err) {
                    return done(err);
                }
                done(new Error('Should not have called next'));
            });
        });

        it('returns original URL if file is empty', function (done) {
            dummyStorage.exists = async function (path) {
                if (path === '/blank_o.png') {
                    return true;
                }
                if (path === '/size/w1000/blank.png') {
                    return false;
                }
            };
            dummyStorage.read = async function (path) {
                return Buffer.from([]);
            };

            const fakeReq = {
                url: '/size/w1000/blank.png',
                originalUrl: '/blog/content/images/size/w1000/blank.png'
            };
            const fakeRes = {
                redirect(url) {
                    try {
                        url.should.equal('/blog/content/images/blank.png');
                    } catch (e) {
                        return done(e);
                    }                    
                    done();
                }
            };

            handleImageSizes(fakeReq, fakeRes, function next(err) {
                if (err) {
                    return done(err);
                }
                done(new Error('Should not have called next'));
            });
        });

        it('continues if file exists', function (done) {
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
                redirect(url) {
                    done(new Error('Should not have called redirect'));
                }
            };

            handleImageSizes(fakeReq, fakeRes, function next(err) {
                if (err) {
                    return done(err);
                }
                done();
            });
        });

        it('uses unoptimizedImageExists if it exists', function (done) {
            dummyStorage.exists = async function (path) {
                if (path === '/blank_o.png') {
                    return true;
                }
            };
            const spy = sinon.spy(dummyStorage, 'read');

            const fakeReq = {
                url: '/size/w1000/blank.png',
                originalUrl: '/size/w1000/blank.png'
            };
            const fakeRes = {
                redirect(url) {
                    done(new Error('Should not have called redirect'));
                }
            };

            handleImageSizes(fakeReq, fakeRes, function next(err) {
                if (err) {
                    return done(err);
                }
                try {
                    spy.calledOnceWithExactly({path: '/blank_o.png'}).should.be.true();
                } catch (e) {
                    return done(e);
                }
                done();
            });
        });

        it('uses unoptimizedImageExists if it exists with formatting', function (done) {
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
                redirect(url) {
                    done(new Error('Should not have called redirect'));
                },
                type: function () {}
            };
            const typeStub = sinon.spy(fakeRes, 'type');

            handleImageSizes(fakeReq, fakeRes, function next(err) {
                if (err) {
                    return done(err);
                }
                try {
                    spy.calledOnceWithExactly({path: '/blank_o.png'}).should.be.true();
                    typeStub.calledOnceWithExactly('webp').should.be.true();
                } catch (e) {
                    return done(e);
                }
                done();
            });
        });

        it('skips SVG if not formatted', function (done) {
            dummyStorage.exists = async function (path) {
                return false;
            };

            const fakeReq = {
                url: '/size/w1000/blank.svg',
                originalUrl: '/blog/content/images/size/w1000/blank.svg'
            };
            const fakeRes = {
                redirect(url) {
                    try {
                        url.should.equal('/blog/content/images/blank.svg');
                    } catch (e) {
                        return done(e);
                    }                    
                    done();
                }
            };

            handleImageSizes(fakeReq, fakeRes, function next(err) {
                if (err) {
                    return done(err);
                }
                done(new Error('Should not have called next'));
            });
        });

        it('skips formatting to ico', function (done) {
            dummyStorage.exists = async function (path) {
                return false;
            };

            const fakeReq = {
                url: '/size/w1000/format/ico/blank.png',
                originalUrl: '/blog/content/images/size/w1000/format/ico/blank.png'
            };
            const fakeRes = {
                redirect(url) {
                    try {
                        url.should.equal('/blog/content/images/blank.png');
                    } catch (e) {
                        return done(e);
                    }                    
                    done();
                }
            };

            handleImageSizes(fakeReq, fakeRes, function next(err) {
                if (err) {
                    return done(err);
                }
                done(new Error('Should not have called next'));
            });
        });

        it('skips formatting from ico', function (done) {
            dummyStorage.exists = async function (path) {
                return false;
            };

            const fakeReq = {
                url: '/size/w1000/format/png/blank.ico',
                originalUrl: '/blog/content/images/size/w1000/format/png/blank.ico'
            };
            const fakeRes = {
                redirect(url) {
                    try {
                        url.should.equal('/blog/content/images/blank.ico');
                    } catch (e) {
                        return done(e);
                    }                    
                    done();
                }
            };

            handleImageSizes(fakeReq, fakeRes, function next(err) {
                if (err) {
                    return done(err);
                }
                done(new Error('Should not have called next'));
            });
        });

        it('skips formatting to svg', function (done) {
            dummyStorage.exists = async function (path) {
                return false;
            };

            const fakeReq = {
                url: '/size/w1000/format/svg/blank.png',
                originalUrl: '/blog/content/images/size/w1000/format/svg/blank.png'
            };
            const fakeRes = {
                redirect(url) {
                    try {
                        url.should.equal('/blog/content/images/blank.png');
                    } catch (e) {
                        return done(e);
                    }                    
                    done();
                }
            };

            handleImageSizes(fakeReq, fakeRes, function next(err) {
                if (err) {
                    return done(err);
                }
                done(new Error('Should not have called next'));
            });
        });

        it('doesn\'t skip SVGs if formatted to PNG', function (done) {
            dummyStorage.exists = async function (path) {
                return false;
            };

            const fakeReq = {
                url: '/size/w1000/format/png/blank.svg',
                originalUrl: '/size/w1000/format/png/blank.svg'
            };
            const fakeRes = {
                redirect(url) {
                    done(new Error('Should not have called redirect'));
                },
                type: function () {}
            };
            const typeStub = sinon.spy(fakeRes, 'type');

            handleImageSizes(fakeReq, fakeRes, function next(err) {
                if (err) {
                    return done(err);
                }
                try {
                    resizeFromBufferStub.calledOnceWithExactly(buffer, {withoutEnlargement: false, width: 1000, format: 'png'}).should.be.true();
                    typeStub.calledOnceWithExactly('png').should.be.true();
                } catch (e) {
                    return done(e);
                }
                done();
            });
        });

        it('can format PNG to WEBP', function (done) {
            dummyStorage.exists = async function (path) {
                return false;
            };
            dummyStorage.read = async function (path) {
                return buffer;
            };

            const fakeReq = {
                url: '/size/w1000/format/webp/blank.png',
                originalUrl: '/size/w1000/format/webp/blank.png'
            };
            const fakeRes = {
                redirect(url) {
                    done(new Error('Should not have called redirect'));
                },
                type: function () {}
            };
            const typeStub = sinon.spy(fakeRes, 'type');

            handleImageSizes(fakeReq, fakeRes, function next(err) {
                if (err) {
                    return done(err);
                }
                try {
                    resizeFromBufferStub.calledOnceWithExactly(buffer, {withoutEnlargement: true, width: 1000, format: 'webp'}).should.be.true();
                    typeStub.calledOnceWithExactly('webp').should.be.true();
                } catch (e) {
                    return done(e);
                }
                done();
            });
        });

        it('can format GIF to WEBP', function (done) {
            dummyStorage.exists = async function (path) {
                return false;
            };
            dummyStorage.read = async function (path) {
                return buffer;
            };

            const fakeReq = {
                url: '/size/w1000/format/webp/blank.gif',
                originalUrl: '/size/w1000/format/webp/blank.gif'
            };
            const fakeRes = {
                redirect(url) {
                    done(new Error('Should not have called redirect'));
                },
                type: function () {}
            };
            const typeStub = sinon.spy(fakeRes, 'type');

            handleImageSizes(fakeReq, fakeRes, function next(err) {
                if (err) {
                    return done(err);
                }
                try {
                    resizeFromBufferStub.calledOnceWithExactly(buffer, {withoutEnlargement: true, width: 1000, format: 'webp'}).should.be.true();
                    typeStub.calledOnceWithExactly('webp').should.be.true();
                } catch (e) {
                    return done(e);
                }
                done();
            });
        });

        it('can format WEBP to GIF', function (done) {
            dummyStorage.exists = async function (path) {
                return false;
            };
            dummyStorage.read = async function (path) {
                return buffer;
            };

            const fakeReq = {
                url: '/size/w1000/format/gif/blank.webp',
                originalUrl: '/size/w1000/format/gif/blank.webp'
            };
            const fakeRes = {
                redirect(url) {
                    done(new Error('Should not have called redirect'));
                },
                type: function () {}
            };
            const typeStub = sinon.spy(fakeRes, 'type');

            handleImageSizes(fakeReq, fakeRes, function next(err) {
                if (err) {
                    return done(err);
                }
                try {
                    resizeFromBufferStub.calledOnceWithExactly(buffer, {withoutEnlargement: true, width: 1000, format: 'gif'}).should.be.true();
                    typeStub.calledOnceWithExactly('gif').should.be.true();
                } catch (e) {
                    return done(e);
                }
                done();
            });
        });
    });
});
