const should = require('should');
const sinon = require('sinon');
const storage = require('../../../../../core/server/adapters/storage');
const activeTheme = require('../../../../../core/frontend/services/theme-engine/active');
const handleImageSizes = require('../../../../../core/server/web/site/middleware/handle-image-sizes.js');

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

        this.beforeEach(function () {
            dummyStorage = {
                async exists() {
                    return true;
                },

                read() {
                    return Buffer.from([]);
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
        });

        this.afterEach(function () {
            sinon.restore();
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

            const fakeReq = {
                url: '/size/w1000/blank.png',
                originalUrl: '/size/w1000/blank.png'
            };
            const fakeRes = {
                redirect(url) {
                    url.should.equal('/blank.png');
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
    });
});
