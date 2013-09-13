/*globals describe, beforeEach, it*/
var testUtils = require('./testUtils'),
    should = require('should'),
    sinon = require('sinon'),
    when = require('when'),
    fs = require('fs-extra'),

    // Stuff we are testing
    admin = require('../../server/controllers/admin');

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
        });

        describe('can not upload invalid file', function() {
            it('should return 404 for invalid file type', function() {
                res.send = sinon.stub();
                req.files.uploadimage.name = "INVALID.FILE";
                admin.uploader(req, res);
                res.send.calledOnce.should.be.true;
                res.send.args[0][0].should.equal(404);
                res.send.args[0][1].should.equal('Invalid filetype');
            });
        });


        describe('valid file', function() {

            var clock;

            beforeEach(function() {
                req.files.uploadimage.name = "IMAGE.jpg";
                sinon.stub(fs, 'mkdirs').yields();
                sinon.stub(fs, 'copy').yields();
                sinon.stub(fs, 'exists').yields(false);
            });

            afterEach(function() {
                fs.mkdirs.restore();
                fs.copy.restore();
                fs.exists.restore();
                clock.restore();
            });

            it('can upload jpg', function(done) {
                clock = sinon.useFakeTimers(42);
                sinon.stub(res, 'send', function(data) {
                    data.should.not.equal(404);
                    return done();
                });

                admin.uploader(req, res);
            });

            it('can upload png', function(done) {
                req.files.uploadimage.name = "IMAGE.png";
                clock = sinon.useFakeTimers(42);
                sinon.stub(res, 'send', function(data) {
                    data.should.not.equal(404);
                    return done();
                });

                admin.uploader(req, res);
            });

            it('can upload gif', function(done) {
                req.files.uploadimage.name = "IMAGE.gif";
                clock = sinon.useFakeTimers(42);
                sinon.stub(res, 'send', function(data) {
                    data.should.not.equal(404);
                    return done();
                });

                admin.uploader(req, res);
            });

            it('should send correct path to image when today is in Sep 2013', function(done) {
                clock = sinon.useFakeTimers(1378585460681); // Sat Sep 07 2013 21:24:20 GMT+0100 (BST)
                sinon.stub(res, 'send', function(data) {
                    data.should.equal('/content/images/2013/Sep/IMAGE.jpg');
                    return done();
                });

                return admin.uploader(req, res);
            });

            it('should send correct path to image when today is in Jan 2014', function(done) {
                clock = sinon.useFakeTimers(1388534400000); // Wed Jan 01 2014 00:00:00 GMT+0000 (GMT)
                sinon.stub(res, 'send', function(data) {
                    data.should.equal('/content/images/2014/Jan/IMAGE.jpg');
                    return done();
                });

                admin.uploader(req, res);
            });

            it('can upload two different images with the same name without overwriting the first', function(done) {
                clock = sinon.useFakeTimers(1378634224614); // Sun Sep 08 2013 10:57:04 GMT+0100 (BST)
                fs.exists.withArgs('content/images/2013/Sep/IMAGE.jpg').yields(true);
                fs.exists.withArgs('content/images/2013/Sep/IMAGE-1.jpg').yields(false);

                sinon.stub(res, 'send', function(data) {
                    data.should.equal('/content/images/2013/Sep/IMAGE-1.jpg');
                    return done();
                });

                return admin.uploader(req, res);
            });

            it('can upload five different images with the same name without overwriting the first', function(done) {
                clock = sinon.useFakeTimers(1378634224614); // Sun Sep 08 2013 10:57:04 GMT+0100 (BST)
                fs.exists.withArgs('content/images/2013/Sep/IMAGE.jpg').yields(true);
                fs.exists.withArgs('content/images/2013/Sep/IMAGE-1.jpg').yields(true);
                fs.exists.withArgs('content/images/2013/Sep/IMAGE-2.jpg').yields(true);
                fs.exists.withArgs('content/images/2013/Sep/IMAGE-3.jpg').yields(true);
                fs.exists.withArgs('content/images/2013/Sep/IMAGE-4.jpg').yields(false);

                sinon.stub(res, 'send', function(data) {
                    data.should.equal('/content/images/2013/Sep/IMAGE-4.jpg');
                    return done();
                });

                return admin.uploader(req, res);
            });
        });
    });
});

