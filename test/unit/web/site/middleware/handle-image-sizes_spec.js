const should = require('should');
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
});
