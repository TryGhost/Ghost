/*globals describe, beforeEach, it*/
var fs = require('fs-extra'),
    should = require('should'),
    sinon = require('sinon'),
    localfilesystem = require('../../server/controllers/storage/localfilesystem');

describe('Local File System Storage', function() {

    var image;

    beforeEach(function() {
        sinon.stub(fs, 'mkdirs').yields();
        sinon.stub(fs, 'copy').yields();
        sinon.stub(fs, 'exists').yields(false);
        image = {
            path: "tmp/123456.jpg",
            name: "IMAGE.jpg",
            type: "image/jpeg"
        };
    });

    afterEach(function() {
        fs.mkdirs.restore();
        fs.copy.restore();
        fs.exists.restore();
    });

    it('should send correct path to image when date is in Sep 2013', function(done) {
        // Sat Sep 07 2013 21:24
        var date = new Date(2013, 8, 7, 21, 24).getTime();
        localfilesystem.save(date, image, 'GHOSTURL', function(e, url) {
            url.should.equal('GHOSTURL/content/images/2013/Sep/IMAGE.jpg');
            return done();
        });
    });

    it('should send correct path to image when date is in Jan 2014', function(done) {
        // Jan 1 2014 12:00
        var date = new Date(2014, 0, 1, 12).getTime()
        localfilesystem.save(date, image, 'GHOSTURL', function(e, url) {
            url.should.equal('GHOSTURL/content/images/2014/Jan/IMAGE.jpg');
            return done();
        });
    });

    it('should create month and year directory', function(done) {
       // Sat Sep 07 2013 21:24
        var date = new Date(2013, 8, 7, 21, 24).getTime();
        localfilesystem.save(date, image, 'GHOSTURL', function(e, url) {
            fs.mkdirs.calledOnce.should.be.true;
            fs.mkdirs.args[0][0].should.equal('content/images/2013/Sep');
            return done();
        }); 
    });

    it('should copy temp file to new location', function(done) {
       // Sat Sep 07 2013 21:24
        var date = new Date(2013, 8, 7, 21, 24).getTime();
        localfilesystem.save(date, image, 'GHOSTURL', function(e, url) {
            fs.copy.calledOnce.should.be.true;
            fs.copy.args[0][0].should.equal('tmp/123456.jpg');
            fs.copy.args[0][1].should.equal('content/images/2013/Sep/IMAGE.jpg');
            return done();
        }); 
    });

    it('can upload two different images with the same name without overwriting the first', function(done) {
        // Sun Sep 08 2013 10:57
        var date = new Date(2013, 8, 8, 10, 57).getTime();
        clock = sinon.useFakeTimers(date);
        fs.exists.withArgs('content/images/2013/Sep/IMAGE.jpg').yields(true);
        fs.exists.withArgs('content/images/2013/Sep/IMAGE-1.jpg').yields(false);

        // if on windows need to setup with back slashes
        // doesn't hurt for the test to cope with both
        fs.exists.withArgs('content\\images\\2013\\Sep\\IMAGE.jpg').yields(true);
        fs.exists.withArgs('content\\images\\2013\\Sep\\IMAGE-1.jpg').yields(false);

        localfilesystem.save(date, image, 'GHOSTURL', function(e, url) {
            url.should.equal('GHOSTURL/content/images/2013/Sep/IMAGE-1.jpg');
            return done();
        });
    });

    it('can upload five different images with the same name without overwriting the first', function(done) {
        // Sun Sep 08 2013 10:57
        var date = new Date(2013, 8, 8, 10, 57).getTime();
        clock = sinon.useFakeTimers(date);
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

        localfilesystem.save(date, image, 'GHOSTURL', function(e, url) {
            url.should.equal('GHOSTURL/content/images/2013/Sep/IMAGE-4.jpg');
            return done();
        });
    });

    // TODO tests to check for working on windows
});