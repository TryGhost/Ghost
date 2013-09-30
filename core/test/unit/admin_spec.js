/*globals describe, beforeEach, it*/
var fs = require('fs-extra'),
    // SandboxedModule = require('sandboxed-module'),
    should = require('should'),
    sinon = require('sinon'),
    testUtils = require('./testUtils'),
    when = require('when'),

    // Stuff we are testing
    admin = require('../../server/controllers/admin');

    // This might work instead of exposing the get_storage method
    // localfilesystem = sinon.stub(),
    // admin = SandboxedModule.require('../../server/controllers/admin', {
    //   requires: {'./storage/localfilesystem.js': localfilesystem}
    // });

describe('Admin Controller', function() {
    describe('uploader', function() {

        var req;
        var res;

        beforeEach(function() {
            req = {
                    files: {
                        uploadimage: {
                            path: "/tmp/TMPFILEID"
                        }
                    }
                };

            res = {
                send: function(){}
            };

            // localfilesystem.save = sinon.stub().returns(when('URL'));
        });

        describe('can not upload invalid file', function() {
            it('should return 404 for invalid file type', function() {
                res.send = sinon.stub();
                req.files.uploadimage.name = 'INVALID.FILE';
                req.files.uploadimage.type = 'application/octet-stream'
                admin.uploader(req, res);
                res.send.calledOnce.should.be.true;
                res.send.args[0][0].should.equal(404);
                res.send.args[0][1].should.equal('Invalid filetype');
            });
        });

        describe('can not upload file with valid extension but invalid type', function() {
            it('should return 404 for invalid file type', function() {
                res.send = sinon.stub();
                req.files.uploadimage.name = 'INVALID.jpg';
                req.files.uploadimage.type = 'application/octet-stream'
                admin.uploader(req, res);
                res.send.calledOnce.should.be.true;
                res.send.args[0][0].should.equal(404);
                res.send.args[0][1].should.equal('Invalid filetype');
            });
        });

        describe('valid file', function() {

            beforeEach(function() {
                req.files.uploadimage.name = 'IMAGE.jpg';
                req.files.uploadimage.type = 'image/jpeg';
                sinon.stub(fs, 'unlink').yields();
                var storage = sinon.stub();
                storage.save = sinon.stub().returns(when('URL'));
                sinon.stub(admin, 'get_storage').returns(storage);
            });

            afterEach(function() {
                fs.unlink.restore();
                admin.get_storage.restore();
            });

            it('can upload jpg', function(done) {
                sinon.stub(res, 'send', function(data) {
                    data.should.not.equal(404);
                    return done();
                });

                admin.uploader(req, res);
            });

            it('can upload jpg with incorrect extension', function(done) {
                req.files.uploadimage.name = 'IMAGE.xjpg';
                sinon.stub(res, 'send', function(data) {
                    data.should.not.equal(404);
                    return done();
                });

                admin.uploader(req, res);
            });

            it('can upload png', function(done) {
                req.files.uploadimage.name = 'IMAGE.png';
                req.files.uploadimage.type = 'image/png';
                sinon.stub(res, 'send', function(data) {
                    data.should.not.equal(404);
                    return done();
                });

                admin.uploader(req, res);
            });

            it('can upload gif', function(done) {
                req.files.uploadimage.name = 'IMAGE.gif';
                req.files.uploadimage.type = 'image/gif';
                sinon.stub(res, 'send', function(data) {
                    data.should.not.equal(404);
                    return done();
                });

                admin.uploader(req, res);
            });

            it('should not leave temporary file when uploading', function(done) {
                sinon.stub(res, 'send', function(data) {
                    fs.unlink.calledOnce.should.be.true;
                    fs.unlink.args[0][0].should.equal('/tmp/TMPFILEID');
                    return done();
                });

                admin.uploader(req, res);
            });
        });
    });
});

