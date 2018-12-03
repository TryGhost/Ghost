const should = require('should');
const handleImageSizes = require('../../../../../server/web/shared/middlewares/image/handle-image-sizes.js');

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
});
