var fs              = require('fs-extra'),
    moment          = require('moment'),
    path            = require('path'),
    should          = require('should'),
    sinon           = require('sinon'),
    LocalFileStore  = require('../../../server/storage/local-file-store'),
    localFileStore,

    configUtils     = require('../../utils/configUtils');

// To stop jshint complaining
should.equal(true, true);

describe('Local File System Storage', function () {
    var image,
        momentStub;

    function fakeDate(mm, yyyy) {
        var month = parseInt(mm, 10),
            year = parseInt(yyyy, 10);

        momentStub.withArgs('YYYY').returns(year.toString());
        momentStub.withArgs('MM').returns(month < 10 ? '0' + month.toString() : month.toString());
    }

    before(function () {
        momentStub = sinon.stub(moment.fn, 'format');
    });

    after(function () {
        momentStub.restore();
    });

    beforeEach(function () {
        sinon.stub(fs, 'mkdirs').yields();
        sinon.stub(fs, 'copy').yields();
        sinon.stub(fs, 'stat').yields(true);
        sinon.stub(fs, 'unlink').yields();

        image = {
            path: 'tmp/123456.jpg',
            name: 'IMAGE.jpg',
            type: 'image/jpeg'
        };

        localFileStore = new LocalFileStore();

        fakeDate(9, 2013);
    });

    afterEach(function () {
        fs.mkdirs.restore();
        fs.copy.restore();
        fs.stat.restore();
        fs.unlink.restore();
        configUtils.restore();
    });

    it('should send correct path to image when date is in Sep 2013', function () {
        return localFileStore.save(image).then(function (url) {
            url.should.equal('/content/images/2013/09/IMAGE.jpg');
        });
    });

    it('should send correct path to image when original file has spaces', function () {
        image.name = 'AN IMAGE.jpg';
        return localFileStore.save(image).then(function (url) {
            url.should.equal('/content/images/2013/09/AN-IMAGE.jpg');
        });
    });

    it('should allow "@" symbol to image for Apple hi-res (retina) modifier', function () {
        image.name = 'photo@2x.jpg';
        return localFileStore.save(image).then(function (url) {
            url.should.equal('/content/images/2013/09/photo@2x.jpg');
        });
    });

    it('should send correct path to image when date is in Jan 2014', function () {
        fakeDate(1, 2014);

        return localFileStore.save(image).then(function (url) {
            url.should.equal('/content/images/2014/01/IMAGE.jpg');
        });
    });

    it('should create month and year directory', function () {
        return localFileStore.save(image).then(function () {
            fs.mkdirs.calledOnce.should.be.true();
            fs.mkdirs.args[0][0].should.equal(path.resolve('./content/images/2013/09'));
        });
    });

    it('should copy temp file to new location', function () {
        return localFileStore.save(image).then(function () {
            fs.copy.calledOnce.should.be.true();
            fs.copy.args[0][0].should.equal('tmp/123456.jpg');
            fs.copy.args[0][1].should.equal(path.resolve('./content/images/2013/09/IMAGE.jpg'));
        });
    });

    it('can upload two different images with the same name without overwriting the first', function () {
        fs.stat.withArgs(path.resolve('./content/images/2013/09/IMAGE.jpg')).yields(false);
        fs.stat.withArgs(path.resolve('./content/images/2013/09/IMAGE-1.jpg')).yields(true);

        // if on windows need to setup with back slashes
        // doesn't hurt for the test to cope with both
        fs.stat.withArgs(path.resolve('.\\content\\images\\2013\\Sep\\IMAGE.jpg')).yields(false);
        fs.stat.withArgs(path.resolve('.\\content\\images\\2013\\Sep\\IMAGE-1.jpg')).yields(true);

        return localFileStore.save(image).then(function (url) {
            url.should.equal('/content/images/2013/09/IMAGE-1.jpg');
        });
    });

    it('can upload five different images with the same name without overwriting the first', function () {
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

        return localFileStore.save(image).then(function (url) {
            url.should.equal('/content/images/2013/09/IMAGE-4.jpg');
        });
    });

    describe('validate extentions', function () {
        it('name contains a .\d as extension', function () {
            return localFileStore.save({
                name: 'test-1.1.1'
            }).then(function (url) {
                should.exist(url.match(/test-1.1.1/));
            });
        });

        it('name contains a .zip as extension', function () {
            return localFileStore.save({
                name: 'test-1.1.1.zip'
            }).then(function (url) {
                should.exist(url.match(/test-1.1.1.zip/));
            });
        });

        it('name contains a .jpeg as extension', function () {
            return localFileStore.save({
                name: 'test-1.1.1.jpeg'
            }).then(function (url) {
                should.exist(url.match(/test-1.1.1.jpeg/));
            });
        });
    });

    describe('when a custom content path is used', function () {
        beforeEach(function () {
            var configPaths = configUtils.defaultConfig.paths;
            configUtils.set('paths:contentPath', configPaths.appRoot + '/var/ghostcms');
        });

        it('should send the correct path to image', function () {
            return localFileStore.save(image).then(function (url) {
                url.should.equal('/content/images/2013/09/IMAGE.jpg');
            });
        });
    });

    // @TODO: remove path.join mock...
    describe('on Windows', function () {
        var truePathSep = path.sep;

        beforeEach(function () {
            sinon.stub(path, 'join');
            sinon.stub(configUtils.config, 'getContentPath').returns('content/images/');
        });

        afterEach(function () {
            path.join.restore();
            configUtils.config.getContentPath.restore();

            path.sep = truePathSep;
        });

        it('should return url in proper format for windows', function () {
            path.sep = '\\';
            path.join.returns('content\\images\\2013\\09\\IMAGE.jpg');

            return localFileStore.save(image).then(function (url) {
                if (truePathSep === '\\') {
                    url.should.equal('/content/images/2013/09/IMAGE.jpg');
                } else {
                    // if this unit test is run on an OS that uses forward slash separators,
                    // localfilesystem.save() will use a path.relative() call on
                    // one path with backslash separators and one path with forward
                    // slashes and it returns a path that needs to be normalized
                    path.normalize(url).should.equal('/content/images/2013/09/IMAGE.jpg');
                }
            });
        });
    });
});
