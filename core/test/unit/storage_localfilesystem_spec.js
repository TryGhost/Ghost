/*globals describe, beforeEach, afterEach, it*/
var fs = require('fs-extra'),
    path = require('path'),
    should = require('should'),
    sinon = require('sinon'),
    when = require('when'),
    localfilesystem = require('../../server/storage/localfilesystem');

describe('Local File System Storage', function () {

    var image;

    beforeEach(function () {
        sinon.stub(fs, 'mkdirs').yields();
        sinon.stub(fs, 'copy').yields();
        sinon.stub(fs, 'exists').yields(false);
        sinon.stub(fs, 'unlink').yields();

        image = {
            path: "tmp/123456.jpg",
            name: "IMAGE.jpg",
            type: "image/jpeg"
        };

        // Sat Sep 07 2013 21:24
        this.clock = sinon.useFakeTimers(new Date(2013, 8, 7, 21, 24).getTime());
    });

    afterEach(function () {
        fs.mkdirs.restore();
        fs.copy.restore();
        fs.exists.restore();
        fs.unlink.restore();
        this.clock.restore();
    });

    it('should send correct path to image when date is in Sep 2013', function (done) {
        localfilesystem.save(image).then(function (url) {
            url.should.equal('/content/images/2013/Sep/IMAGE.jpg');
            return done();
        });
    });

    it('should send correct path to image when original file has spaces', function (done) {
        image.name = 'AN IMAGE.jpg';
        localfilesystem.save(image).then(function (url) {
            url.should.equal('/content/images/2013/Sep/AN_IMAGE.jpg');
            return done();
        });
    });

    it('should send correct path to image when date is in Jan 2014', function (done) {
        // Jan 1 2014 12:00
        this.clock = sinon.useFakeTimers(new Date(2014, 0, 1, 12).getTime());
        localfilesystem.save(image).then(function (url) {
            url.should.equal('/content/images/2014/Jan/IMAGE.jpg');
            return done();
        });
    });

    it('should create month and year directory', function (done) {
        localfilesystem.save(image).then(function (url) {
            fs.mkdirs.calledOnce.should.be.true;
            fs.mkdirs.args[0][0].should.equal(path.join('content/images/2013/Sep'));
            done();
        }).then(null, done);
    });

    it('should copy temp file to new location', function (done) {
        localfilesystem.save(image).then(function (url) {
            fs.copy.calledOnce.should.be.true;
            fs.copy.args[0][0].should.equal('tmp/123456.jpg');
            fs.copy.args[0][1].should.equal(path.join('content/images/2013/Sep/IMAGE.jpg'));
            done();
        }).then(null, done);
    });

    it('should not leave temporary file when uploading', function (done) {
        localfilesystem.save(image).then(function (url) {
            fs.unlink.calledOnce.should.be.true;
            fs.unlink.args[0][0].should.equal('tmp/123456.jpg');
            done();
        }).then(null, done);
    });

    it('can upload two different images with the same name without overwriting the first', function (done) {
        // Sun Sep 08 2013 10:57
        this.clock = sinon.useFakeTimers(new Date(2013, 8, 8, 10, 57).getTime());
        fs.exists.withArgs('content/images/2013/Sep/IMAGE.jpg').yields(true);
        fs.exists.withArgs('content/images/2013/Sep/IMAGE-1.jpg').yields(false);

        // if on windows need to setup with back slashes
        // doesn't hurt for the test to cope with both
        fs.exists.withArgs('content\\images\\2013\\Sep\\IMAGE.jpg').yields(true);
        fs.exists.withArgs('content\\images\\2013\\Sep\\IMAGE-1.jpg').yields(false);

        localfilesystem.save(image).then(function (url) {
            url.should.equal('/content/images/2013/Sep/IMAGE-1.jpg');
            return done();
        });
    });

    it('can upload five different images with the same name without overwriting the first', function (done) {
        // Sun Sep 08 2013 10:57
        this.clock = sinon.useFakeTimers(new Date(2013, 8, 8, 10, 57).getTime());
        fs.exists.withArgs('content/images/2013/Sep/IMAGE.jpg').yields(true);
        fs.exists.withArgs('content/images/2013/Sep/IMAGE-1.jpg').yields(true);
        fs.exists.withArgs('content/images/2013/Sep/IMAGE-2.jpg').yields(true);
        fs.exists.withArgs('content/images/2013/Sep/IMAGE-3.jpg').yields(true);
        fs.exists.withArgs('content/images/2013/Sep/IMAGE-4.jpg').yields(false);

        // windows setup
        fs.exists.withArgs('content\\images\\2013\\Sep\\IMAGE.jpg').yields(true);
        fs.exists.withArgs('content\\images\\2013\\Sep\\IMAGE-1.jpg').yields(true);
        fs.exists.withArgs('content\\images\\2013\\Sep\\IMAGE-2.jpg').yields(true);
        fs.exists.withArgs('content\\images\\2013\\Sep\\IMAGE-3.jpg').yields(true);
        fs.exists.withArgs('content\\images\\2013\\Sep\\IMAGE-4.jpg').yields(false);

        localfilesystem.save(image).then(function (url) {
            url.should.equal('/content/images/2013/Sep/IMAGE-4.jpg');
            return done();
        });
    });


    describe('on Windows', function () {
        // TODO tests to check for working on windows

        var truePathSep = path.sep;

        beforeEach(function () {
            sinon.stub(path, 'join');
        });

        afterEach(function () {
            path.join.restore();
            path.sep = truePathSep;
        });

        it('should return url in proper format for windows', function (done) {
            path.sep = '\\';
            path.join.returns('content\\images\\2013\\Sep\\IMAGE.jpg');
            localfilesystem.save(image).then(function (url) {
                url.should.equal('/content/images/2013/Sep/IMAGE.jpg');
                return done();
            });
        });
    });
});
