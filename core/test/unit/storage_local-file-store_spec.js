/*globals describe, beforeEach, afterEach, it*/
/*jshint expr:true*/
var fs              = require('fs-extra'),
    path            = require('path'),
    should          = require('should'),
    sinon           = require('sinon'),
    rewire          = require('rewire'),
    _               = require('lodash'),
    config          = rewire('../../server/config'),
    LocalFileStore  = rewire('../../server/storage/local-file-store'),
    localFileStore;

// To stop jshint complaining
should.equal(true, true);

describe('Local File System Storage', function () {
    var image,
        overrideConfig = function (newConfig) {
            var existingConfig = LocalFileStore.__get__('config'),
                updatedConfig = _.extend({}, existingConfig, newConfig);
            config.set(updatedConfig);
            LocalFileStore.__set__('config', updatedConfig);
        };

    beforeEach(function () {
        overrideConfig(config);

        sinon.stub(fs, 'mkdirs').yields();
        sinon.stub(fs, 'copy').yields();
        sinon.stub(fs, 'stat').yields(true);
        sinon.stub(fs, 'unlink').yields();

        image = {
            path: 'tmp/123456.jpg',
            name: 'IMAGE.jpg',
            type: 'image/jpeg'
        };

        // Sat Sep 07 2013 21:24
        this.clock = sinon.useFakeTimers(new Date(2013, 8, 7, 21, 24).getTime());

        localFileStore = new LocalFileStore();
    });

    afterEach(function () {
        fs.mkdirs.restore();
        fs.copy.restore();
        fs.stat.restore();
        fs.unlink.restore();
        this.clock.restore();
    });

    it('should send correct path to image when date is in Sep 2013', function (done) {
        localFileStore.save(image).then(function (url) {
            url.should.equal('/content/images/2013/09/IMAGE.jpg');
            return done();
        }).catch(done);
    });

    it('should send correct path to image when original file has spaces', function (done) {
        image.name = 'AN IMAGE.jpg';
        localFileStore.save(image).then(function (url) {
            url.should.equal('/content/images/2013/09/AN-IMAGE.jpg');
            return done();
        }).catch(done);
    });

    it('should send correct path to image when date is in Jan 2014', function (done) {
        // Jan 1 2014 12:00
        this.clock = sinon.useFakeTimers(new Date(2014, 0, 1, 12).getTime());
        localFileStore.save(image).then(function (url) {
            url.should.equal('/content/images/2014/01/IMAGE.jpg');
            return done();
        }).catch(done);
    });

    it('should create month and year directory', function (done) {
        localFileStore.save(image).then(function (url) {
            /*jshint unused:false*/
            fs.mkdirs.calledOnce.should.be.true;
            fs.mkdirs.args[0][0].should.equal(path.resolve('./content/images/2013/09'));
            done();
        }).catch(done);
    });

    it('should copy temp file to new location', function (done) {
        localFileStore.save(image).then(function (url) {
            /*jshint unused:false*/
            fs.copy.calledOnce.should.be.true;
            fs.copy.args[0][0].should.equal('tmp/123456.jpg');
            fs.copy.args[0][1].should.equal(path.resolve('./content/images/2013/09/IMAGE.jpg'));
            done();
        }).catch(done);
    });

    it('can upload two different images with the same name without overwriting the first', function (done) {
        // Sun Sep 08 2013 10:57
        this.clock = sinon.useFakeTimers(new Date(2013, 8, 8, 10, 57).getTime());
        fs.stat.withArgs(path.resolve('./content/images/2013/09/IMAGE.jpg')).yields(false);
        fs.stat.withArgs(path.resolve('./content/images/2013/09/IMAGE-1.jpg')).yields(true);

        // if on windows need to setup with back slashes
        // doesn't hurt for the test to cope with both
        fs.stat.withArgs(path.resolve('.\\content\\images\\2013\\Sep\\IMAGE.jpg')).yields(false);
        fs.stat.withArgs(path.resolve('.\\content\\images\\2013\\Sep\\IMAGE-1.jpg')).yields(true);

        localFileStore.save(image).then(function (url) {
            url.should.equal('/content/images/2013/09/IMAGE-1.jpg');
            return done();
        }).catch(done);
    });

    it('can upload five different images with the same name without overwriting the first', function (done) {
        // Sun Sep 08 2013 10:57
        this.clock = sinon.useFakeTimers(new Date(2013, 8, 8, 10, 57).getTime());
        fs.stat.withArgs(path.resolve('./content/images/2013/09/IMAGE.jpg')).yields(false);
        fs.stat.withArgs(path.resolve('./content/images/2013/09/IMAGE-1.jpg')).yields(false);
        fs.stat.withArgs(path.resolve('./content/images/2013/09/IMAGE-2.jpg')).yields(false);
        fs.stat.withArgs(path.resolve('./content/images/2013/09/IMAGE-3.jpg')).yields(false);
        fs.stat.withArgs(path.resolve('./content/images/2013/09/IMAGE-4.jpg')).yields(true);

        // windows setup
        fs.stat.withArgs(path.resolve('.\\content\\images\\2013\\Sep\\IMAGE.jpg')).yields(false);
        fs.stat.withArgs(path.resolve('.\\content\\images\\2013\\Sep\\IMAGE-1.jpg')).yields(false);
        fs.stat.withArgs(path.resolve('.\\content\\images\\2013\\Sep\\IMAGE-2.jpg')).yields(false);
        fs.stat.withArgs(path.resolve('.\\content\\images\\2013\\Sep\\IMAGE-3.jpg')).yields(false);
        fs.stat.withArgs(path.resolve('.\\content\\images\\2013\\Sep\\IMAGE-4.jpg')).yields(true);

        localFileStore.save(image).then(function (url) {
            url.should.equal('/content/images/2013/09/IMAGE-4.jpg');
            return done();
        }).catch(done);
    });

    describe('when a custom content path is used', function () {
        var origContentPath = config.paths.contentPath,
            origImagesPath = config.paths.imagesPath;

        beforeEach(function () {
            config.paths.contentPath = config.paths.appRoot + '/var/ghostcms';
            config.paths.imagesPath = config.paths.appRoot + '/var/ghostcms/' + config.paths.imagesRelPath;
        });

        afterEach(function () {
            config.paths.contentPath = origContentPath;
            config.paths.imagesPath = origImagesPath;
        });

        it('should send the correct path to image', function (done) {
            localFileStore.save(image).then(function (url) {
                url.should.equal('/content/images/2013/09/IMAGE.jpg');
                return done();
            }).catch(done);
        });
    });

    describe('on Windows', function () {
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
            path.join.returns('content\\images\\2013\\09\\IMAGE.jpg');
            localFileStore.save(image).then(function (url) {
                if (truePathSep === '\\') {
                    url.should.equal('/content/images/2013/09/IMAGE.jpg');
                } else {
                    // if this unit test is run on an OS that uses forward slash separators,
                    // localfilesystem.save() will use a path.relative() call on
                    // one path with backslash separators and one path with forward
                    // slashes and it returns a path that needs to be normalized
                    path.normalize(url).should.equal('/content/images/2013/09/IMAGE.jpg');
                }
                return done();
            }).catch(done);
        });
    });
});
