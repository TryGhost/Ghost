/*globals describe, beforeEach, afterEach, it*/
var fs          = require('fs-extra'),
    should      = require('should'),
    sinon       = require('sinon'),
    Promise     = require('bluebird'),
    storage     = require('../../../server/storage'),

    // Stuff we are testing
    UploadAPI   = require('../../../server/api/upload'),
    store;

describe('Upload API', function () {
    // Doesn't test the DB

    afterEach(function () {
        storage.getStorage.restore();
        fs.unlink.restore();
    });

    beforeEach(function () {
        store = sinon.stub();
        store.save = sinon.stub().returns(Promise.resolve('URL'));
        store.exists = sinon.stub().returns(Promise.resolve(true));
        store.destroy = sinon.stub().returns(Promise.resolve());
        sinon.stub(storage, 'getStorage').returns(store);
        sinon.stub(fs, 'unlink').yields();
    });

    should.exist(UploadAPI);

    describe('invalid file', function () {
        it('should return 415 for invalid file type', function (done) {
            var uploadimage = {
                name: 'INVALID.FILE',
                type: 'application/octet-stream',
                path: '/tmp/TMPFILEID'
            };
            UploadAPI.add({uploadimage: uploadimage}).then(function () {
                done(new Error('Upload suceeded with invalid file.'));
            }, function (result) {
                result.statusCode.should.equal(415);
                result.errorType.should.equal('UnsupportedMediaTypeError');
                done();
            });
        });
    });

    describe('valid extension but invalid type', function () {
        it('should return 415 for invalid file type', function (done) {
            var uploadimage = {
                name: 'INVALID.jpg',
                type: 'application/octet-stream',
                path: '/tmp/TMPFILEID'
            };
            UploadAPI.add({uploadimage: uploadimage}).then(function () {
                done(new Error('Upload suceeded with invalid file.'));
            }, function (result) {
                result.statusCode.should.equal(415);
                result.errorType.should.equal('UnsupportedMediaTypeError');
                done();
            });
        });
    });

    describe('valid file', function () {
        it('can upload jpg', function (done) {
            var uploadimage = {
                name: 'INVALID.jpg',
                type: 'image/jpeg',
                path: '/tmp/TMPFILEID'
            };
            UploadAPI.add({uploadimage: uploadimage}).then(function (result) {
                result.should.equal('URL');
                done();
            });
        });

        it('cannot upload jpg with incorrect extension', function (done) {
            var uploadimage = {
                name: 'INVALID.xjpg',
                type: 'image/jpeg',
                path: '/tmp/TMPFILEID'
            };
            UploadAPI.add({uploadimage: uploadimage}).then(function () {
                done(new Error('Upload suceeded with invalid file.'));
            }, function (result) {
                result.statusCode.should.equal(415);
                result.errorType.should.equal('UnsupportedMediaTypeError');
                done();
            });
        });

        it('can upload png', function (done) {
            var uploadimage = {
                name: 'INVALID.png',
                type: 'image/png',
                path: '/tmp/TMPFILEID'
            };
            UploadAPI.add({uploadimage: uploadimage}).then(function (result) {
                result.should.equal('URL');
                done();
            });
        });

        it('can upload gif', function (done) {
            var uploadimage = {
                name: 'INVALID.gif',
                type: 'image/gif',
                path: '/tmp/TMPFILEID'
            };
            UploadAPI.add({uploadimage: uploadimage}).then(function (result) {
                result.should.equal('URL');
                done();
            });
        });
    });
});
