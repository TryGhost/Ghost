var should = require('should'), // jshint ignore:line
    sinon = require('sinon'),
    fs = require('fs-extra'),
    moment = require('moment'),
    Promise = require('bluebird'),
    path = require('path'),
    common = require('../../../../server/lib/common'),
    LocalFileStore = require('../../../../server/adapters/storage/LocalFileStorage'),
    localFileStore,

    configUtils = require('../../../utils/configUtils'),

    sandbox = sinon.sandbox.create();

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
        // Fake a date, do this once for all tests in this file
        momentStub = sinon.stub(moment.fn, 'format');
    });

    after(function () {
        // Moment stub requires it's own restore after all the tests
        momentStub.restore();
    });

    afterEach(function () {
        sandbox.restore();
        configUtils.restore();
    });

    beforeEach(function () {
        sandbox.stub(fs, 'mkdirs').resolves();
        sandbox.stub(fs, 'copy').resolves();
        sandbox.stub(fs, 'stat').rejects();
        sandbox.stub(fs, 'unlink').resolves();

        image = {
            path: 'tmp/123456.jpg',
            name: 'IMAGE.jpg',
            type: 'image/jpeg'
        };

        localFileStore = new LocalFileStore();

        fakeDate(9, 2013);
    });

    it('should send correct path to image when date is in Sep 2013', function (done) {
        localFileStore.save(image).then(function (url) {
            url.should.equal('/content/images/2013/09/IMAGE.jpg');

            done();
        }).catch(done);
    });

    it('should send correct path to image when original file has spaces', function (done) {
        image.name = 'AN IMAGE.jpg';
        localFileStore.save(image).then(function (url) {
            url.should.equal('/content/images/2013/09/AN-IMAGE.jpg');

            done();
        }).catch(done);
    });

    it('should allow "@" symbol to image for Apple hi-res (retina) modifier', function (done) {
        image.name = 'photo@2x.jpg';
        localFileStore.save(image).then(function (url) {
            url.should.equal('/content/images/2013/09/photo@2x.jpg');

            done();
        }).catch(done);
    });

    it('should send correct path to image when date is in Jan 2014', function (done) {
        fakeDate(1, 2014);

        localFileStore.save(image).then(function (url) {
            url.should.equal('/content/images/2014/01/IMAGE.jpg');

            done();
        }).catch(done);
    });

    it('should create month and year directory', function (done) {
        localFileStore.save(image).then(function () {
            fs.mkdirs.calledOnce.should.be.true();
            fs.mkdirs.args[0][0].should.equal(path.resolve('./content/images/2013/09'));

            done();
        }).catch(done);
    });

    it('should copy temp file to new location', function (done) {
        localFileStore.save(image).then(function () {
            fs.copy.calledOnce.should.be.true();
            fs.copy.args[0][0].should.equal('tmp/123456.jpg');
            fs.copy.args[0][1].should.equal(path.resolve('./content/images/2013/09/IMAGE.jpg'));

            done();
        }).catch(done);
    });

    it('can upload two different images with the same name without overwriting the first', function (done) {
        fs.stat.withArgs(path.resolve('./content/images/2013/09/IMAGE.jpg')).resolves();
        fs.stat.withArgs(path.resolve('./content/images/2013/09/IMAGE-1.jpg')).rejects();

        // if on windows need to setup with back slashes
        // doesn't hurt for the test to cope with both
        fs.stat.withArgs(path.resolve('.\\content\\images\\2013\\Sep\\IMAGE.jpg')).resolves();
        fs.stat.withArgs(path.resolve('.\\content\\images\\2013\\Sep\\IMAGE-1.jpg')).rejects();

        localFileStore.save(image).then(function (url) {
            url.should.equal('/content/images/2013/09/IMAGE-1.jpg');

            done();
        }).catch(done);
    });

    it('can upload five different images with the same name without overwriting the first', function (done) {
        fs.stat.withArgs(path.resolve('./content/images/2013/09/IMAGE.jpg')).resolves();
        fs.stat.withArgs(path.resolve('./content/images/2013/09/IMAGE-1.jpg')).resolves();
        fs.stat.withArgs(path.resolve('./content/images/2013/09/IMAGE-2.jpg')).resolves();
        fs.stat.withArgs(path.resolve('./content/images/2013/09/IMAGE-3.jpg')).resolves();
        fs.stat.withArgs(path.resolve('./content/images/2013/09/IMAGE-4.jpg')).rejects();

        // windows setup
        fs.stat.withArgs(path.resolve('.\\content\\images\\2013\\Sep\\IMAGE.jpg')).resolves();
        fs.stat.withArgs(path.resolve('.\\content\\images\\2013\\Sep\\IMAGE-1.jpg')).resolves();
        fs.stat.withArgs(path.resolve('.\\content\\images\\2013\\Sep\\IMAGE-2.jpg')).resolves();
        fs.stat.withArgs(path.resolve('.\\content\\images\\2013\\Sep\\IMAGE-3.jpg')).resolves();
        fs.stat.withArgs(path.resolve('.\\content\\images\\2013\\Sep\\IMAGE-4.jpg')).rejects();

        localFileStore.save(image).then(function (url) {
            url.should.equal('/content/images/2013/09/IMAGE-4.jpg');

            done();
        }).catch(done);
    });

    describe('read image', function () {
        beforeEach(function () {
            // we have some example images in our test utils folder
            localFileStore.storagePath = path.join(__dirname, '../../../utils/fixtures/images/');
        });

        it('success', function (done) {
            localFileStore.read({path: 'ghost-logo.png'})
                .then(function (bytes) {
                    bytes.length.should.eql(8638);
                    done();
                });
        });

        it('success', function (done) {
            localFileStore.read({path: '/ghost-logo.png/'})
                .then(function (bytes) {
                    bytes.length.should.eql(8638);
                    done();
                });
        });

        it('image does not exist', function (done) {
            localFileStore.read({path: 'does-not-exist.png'})
                .then(function () {
                    done(new Error('image should not exist'));
                })
                .catch(function (err) {
                    (err instanceof common.errors.NotFoundError).should.eql(true);
                    err.code.should.eql('ENOENT');
                    done();
                });
        });
    });

    describe('validate extentions', function () {
        it('name contains a .\d as extension', function (done) {
            localFileStore.save({
                name: 'test-1.1.1'
            }).then(function (url) {
                should.exist(url.match(/test-1.1.1/));
                done();
            }).catch(done);
        });

        it('name contains a .zip as extension', function (done) {
            localFileStore.save({
                name: 'test-1.1.1.zip'
            }).then(function (url) {
                should.exist(url.match(/test-1.1.1.zip/));
                done();
            }).catch(done);
        });

        it('name contains a .jpeg as extension', function (done) {
            localFileStore.save({
                name: 'test-1.1.1.jpeg'
            }).then(function (url) {
                should.exist(url.match(/test-1.1.1.jpeg/));
                done();
            }).catch(done);
        });
    });

    describe('when a custom content path is used', function () {
        beforeEach(function () {
            var configPaths = configUtils.defaultConfig.paths;
            configUtils.set('paths:contentPath', configPaths.appRoot + '/var/ghostcms');
        });

        it('should send the correct path to image', function (done) {
            localFileStore.save(image).then(function (url) {
                url.should.equal('/content/images/2013/09/IMAGE.jpg');

                done();
            }).catch(done);
        });
    });

    // @TODO: remove path.join mock...
    describe('on Windows', function () {
        var truePathSep = path.sep;

        beforeEach(function () {
            sandbox.stub(path, 'join');
            sandbox.stub(configUtils.config, 'getContentPath').returns('content/images/');
        });

        afterEach(function () {
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

                done();
            }).catch(done);
        });
    });
});
