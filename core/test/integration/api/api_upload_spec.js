/*globals describe, beforeEach, afterEach, it*/
/*jshint expr:true*/
var fs          = require('fs-extra'),
    should      = require('should'),
    sinon       = require('sinon'),
    when        = require('when'),
    storage     = require('../../../server/storage'),

    // Stuff we are testing
    UploadAPI   = require('../../../server/api/upload'),
    store;

// To stop jshint complaining
should.equal(true, true);

describe('Upload API', function () {
    // Doesn't test the DB

    afterEach(function () {
        storage.get_storage.restore();
        fs.unlink.restore();
    });

    beforeEach(function () {
        store = sinon.stub();
        store.save = sinon.stub().returns(when('URL'));
        store.exists = sinon.stub().returns(when(true));
        store.destroy = sinon.stub().returns(when());
        sinon.stub(storage, 'get_storage').returns(store);
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
                    result.code.should.equal(415);
                    result.type.should.equal('UnsupportedMediaTypeError');
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
                    result.code.should.equal(415);
                    result.type.should.equal('UnsupportedMediaTypeError');
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
                    result.code.should.equal(415);
                    result.type.should.equal('UnsupportedMediaTypeError');
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