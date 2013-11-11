/*globals describe, beforeEach, it*/
var fs = require('fs-extra'),
    should = require('should'),
    sinon = require('sinon'),
    when = require('when'),

    // Stuff we are testing
    admin = require('../../server/controllers/admin');

describe('Admin Controller', function () {
    describe('uploader', function () {

        var req, res, storage;

        beforeEach(function () {
            req = {
                files: {
                    uploadimage: {
                        path: "/tmp/TMPFILEID"
                    }
                }
            };

            res = {
                send: function () {
                }
            };

            storage = sinon.stub();
            storage.save = sinon.stub().returns(when('URL'));
            sinon.stub(admin, 'get_storage').returns(storage);
        });

        afterEach(function () {
            admin.get_storage.restore();
        });

        describe('can not upload invalid file', function () {
            it('should return 415 for invalid file type', function () {
                res.send = sinon.stub();
                req.files.uploadimage.name = 'INVALID.FILE';
                req.files.uploadimage.type = 'application/octet-stream'
                admin.uploader(req, res);
                res.send.calledOnce.should.be.true;
                res.send.args[0][0].should.equal(415);
                res.send.args[0][1].should.equal('Unsupported Media Type');
            });
        });

        describe('can not upload file with valid extension but invalid type', function () {
            it('should return 415 for invalid file type', function () {
                res.send = sinon.stub();
                req.files.uploadimage.name = 'INVALID.jpg';
                req.files.uploadimage.type = 'application/octet-stream'
                admin.uploader(req, res);
                res.send.calledOnce.should.be.true;
                res.send.args[0][0].should.equal(415);
                res.send.args[0][1].should.equal('Unsupported Media Type');
            });
        });

        describe('valid file', function () {

            beforeEach(function () {
                req.files.uploadimage.name = 'IMAGE.jpg';
                req.files.uploadimage.type = 'image/jpeg';
                sinon.stub(fs, 'unlink').yields();
            });

            afterEach(function () {
                fs.unlink.restore();
            });

            it('can upload jpg', function (done) {
                sinon.stub(res, 'send', function (data) {
                    data.should.not.equal(415);
                    return done();
                });

                admin.uploader(req, res);
            });

            it('cannot upload jpg with incorrect extension', function (done) {
                req.files.uploadimage.name = 'IMAGE.xjpg';
                sinon.stub(res, 'send', function (data) {
                    data.should.equal(415);
                    return done();
                });

                admin.uploader(req, res);
            });

            it('can upload png', function (done) {
                req.files.uploadimage.name = 'IMAGE.png';
                req.files.uploadimage.type = 'image/png';
                sinon.stub(res, 'send', function (data) {
                    data.should.not.equal(415);
                    return done();
                });

                admin.uploader(req, res);
            });

            it('can upload gif', function (done) {
                req.files.uploadimage.name = 'IMAGE.gif';
                req.files.uploadimage.type = 'image/gif';
                sinon.stub(res, 'send', function (data) {
                    data.should.not.equal(415);
                    return done();
                });

                admin.uploader(req, res);
            });

            it('should not leave temporary file when uploading', function (done) {
                sinon.stub(res, 'send', function (data) {
                    fs.unlink.calledOnce.should.be.true;
                    fs.unlink.args[0][0].should.equal('/tmp/TMPFILEID');
                    return done();
                });

                admin.uploader(req, res);
            });

            it('should send correct url', function (done) {
                sinon.stub(res, 'send', function (data) {
                    data.should.equal('URL');
                    return done();
                });

                admin.uploader(req, res);
            });
        });
    });
});