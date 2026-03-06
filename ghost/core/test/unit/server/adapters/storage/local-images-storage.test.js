const assert = require('node:assert/strict');
const {assertExists} = require('../../../../utils/assertions');
const errors = require('@tryghost/errors');
const sinon = require('sinon');
const fs = require('fs-extra');
const moment = require('moment');
const path = require('path');
const LocalImagesStorage = require('../../../../../core/server/adapters/storage/LocalImagesStorage');
const configUtils = require('../../../../utils/config-utils');

describe('Local Images Storage', function () {
    let image;
    let momentStub;
    let localFileStore;
    let fsMkdirsStub;
    let fsCopyStub;
    let fsStatStub;

    function fakeDate(mm, yyyy) {
        const month = parseInt(mm, 10);
        const year = parseInt(yyyy, 10);

        momentStub.withArgs('YYYY').returns(year.toString());
        momentStub.withArgs('MM').returns(month < 10 ? '0' + month.toString() : month.toString());
    }

    beforeEach(function () {
        // Fake a date, do this once for all tests in this file
        momentStub = sinon.stub(moment.fn, 'format');
    });

    afterEach(async function () {
        sinon.restore();
        await configUtils.restore();
    });

    beforeEach(function () {
        fsMkdirsStub = sinon.stub(fs, 'mkdirs').resolves();
        fsCopyStub = sinon.stub(fs, 'copy').resolves();
        fsStatStub = sinon.stub(fs, 'stat').rejects();
        sinon.stub(fs, 'unlink').resolves();

        image = {
            path: 'tmp/123456.jpg',
            name: 'IMAGE.jpg',
            type: 'image/jpeg'
        };

        localFileStore = new LocalImagesStorage();

        fakeDate(9, 2013);
    });

    it('should send correct path to image when date is in Sep 2013', function (done) {
        localFileStore.save(image).then(function (url) {
            assert.equal(url, '/content/images/2013/09/IMAGE.jpg');

            done();
        }).catch(done);
    });

    it('should send correct path to image when original file has spaces', function (done) {
        image.name = 'AN IMAGE.jpg';
        localFileStore.save(image).then(function (url) {
            assert.equal(url, '/content/images/2013/09/AN-IMAGE.jpg');

            done();
        }).catch(done);
    });

    it('should allow "@" symbol to image for Apple hi-res (retina) modifier', function (done) {
        image.name = 'photo@2x.jpg';
        localFileStore.save(image).then(function (url) {
            assert.equal(url, '/content/images/2013/09/photo@2x.jpg');

            done();
        }).catch(done);
    });

    it('should send correct path to image when date is in Jan 2014', function (done) {
        fakeDate(1, 2014);

        localFileStore.save(image).then(function (url) {
            assert.equal(url, '/content/images/2014/01/IMAGE.jpg');

            done();
        }).catch(done);
    });

    it('should create month and year directory', function (done) {
        localFileStore.save(image).then(function () {
            sinon.assert.calledOnce(fsMkdirsStub);
            assert.equal(fsMkdirsStub.args[0][0], path.resolve('./content/images/2013/09'));

            done();
        }).catch(done);
    });

    it('should copy temp file to new location', function (done) {
        localFileStore.save(image).then(function () {
            sinon.assert.calledOnce(fsCopyStub);
            assert.equal(fsCopyStub.args[0][0], 'tmp/123456.jpg');
            assert.equal(fsCopyStub.args[0][1], path.resolve('./content/images/2013/09/IMAGE.jpg'));

            done();
        }).catch(done);
    });

    it('can upload two different images with the same name without overwriting the first', function (done) {
        fsStatStub.withArgs(path.resolve('./content/images/2013/09/IMAGE.jpg')).resolves();
        fsStatStub.withArgs(path.resolve('./content/images/2013/09/IMAGE-1.jpg')).rejects();

        // if on windows need to setup with back slashes
        // doesn't hurt for the test to cope with both
        fsStatStub.withArgs(path.resolve('.\\content\\images\\2013\\Sep\\IMAGE.jpg')).resolves();
        fsStatStub.withArgs(path.resolve('.\\content\\images\\2013\\Sep\\IMAGE-1.jpg')).rejects();

        localFileStore.save(image).then(function (url) {
            assert.equal(url, '/content/images/2013/09/IMAGE-1.jpg');

            done();
        }).catch(done);
    });

    it('can upload five different images with the same name without overwriting the first', function (done) {
        fsStatStub.withArgs(path.resolve('./content/images/2013/09/IMAGE.jpg')).resolves();
        fsStatStub.withArgs(path.resolve('./content/images/2013/09/IMAGE-1.jpg')).resolves();
        fsStatStub.withArgs(path.resolve('./content/images/2013/09/IMAGE-2.jpg')).resolves();
        fsStatStub.withArgs(path.resolve('./content/images/2013/09/IMAGE-3.jpg')).resolves();
        fsStatStub.withArgs(path.resolve('./content/images/2013/09/IMAGE-4.jpg')).rejects();

        // windows setup
        fsStatStub.withArgs(path.resolve('.\\content\\images\\2013\\Sep\\IMAGE.jpg')).resolves();
        fsStatStub.withArgs(path.resolve('.\\content\\images\\2013\\Sep\\IMAGE-1.jpg')).resolves();
        fsStatStub.withArgs(path.resolve('.\\content\\images\\2013\\Sep\\IMAGE-2.jpg')).resolves();
        fsStatStub.withArgs(path.resolve('.\\content\\images\\2013\\Sep\\IMAGE-3.jpg')).resolves();
        fsStatStub.withArgs(path.resolve('.\\content\\images\\2013\\Sep\\IMAGE-4.jpg')).rejects();

        localFileStore.save(image).then(function (url) {
            assert.equal(url, '/content/images/2013/09/IMAGE-4.jpg');

            done();
        }).catch(done);
    });

    describe('read image', function () {
        beforeEach(function () {
            // we have some example images in our test utils folder
            localFileStore.storagePath = path.join(__dirname, '../../../../utils/fixtures/images/');
        });

        it('success', function (done) {
            localFileStore.read({path: 'ghost-logo.png'})
                .then(function (bytes) {
                    assert.equal(bytes.length, 8638);
                    done();
                });
        });

        it('success (leading and trailing slashes)', function (done) {
            localFileStore.read({path: '/ghost-logo.png/'})
                .then(function (bytes) {
                    assert.equal(bytes.length, 8638);
                    done();
                });
        });

        it('image does not exist', function (done) {
            localFileStore.read({path: 'does-not-exist.png'})
                .then(function () {
                    done(new Error('image should not exist'));
                })
                .catch(function (err) {
                    assert.equal((err instanceof errors.NotFoundError), true);
                    assert.equal(err.code, 'ENOENT');
                    done();
                });
        });
    });

    describe('validate extentions', function () {
        it('name contains a .\d as extension', function (done) {
            localFileStore.save({
                name: 'test-1.1.1'
            }).then(function (url) {
                assertExists(url.match(/test-1.1.1/));
                done();
            }).catch(done);
        });

        it('name contains a .zip as extension', function (done) {
            localFileStore.save({
                name: 'test-1.1.1.zip'
            }).then(function (url) {
                assertExists(url.match(/test-1.1.1.zip/));
                done();
            }).catch(done);
        });

        it('name contains a .jpeg as extension', function (done) {
            localFileStore.save({
                name: 'test-1.1.1.jpeg'
            }).then(function (url) {
                assertExists(url.match(/test-1.1.1.jpeg/));
                done();
            }).catch(done);
        });
    });

    describe('when a custom content path is used', function () {
        beforeEach(function () {
            const configPaths = configUtils.defaultConfig.paths;
            configUtils.set('paths:contentPath', configPaths.appRoot + '/var/ghostcms');
        });

        it('should send the correct path to image', function (done) {
            localFileStore.save(image).then(function (url) {
                assert.equal(url, '/content/images/2013/09/IMAGE.jpg');

                done();
            }).catch(done);
        });
    });

    // @TODO: remove path.join mock...
    describe('on Windows', function () {
        const truePathSep = path.sep;
        let pathJoinStub;

        beforeEach(function () {
            pathJoinStub = sinon.stub(path, 'join');
            sinon.stub(configUtils.config, 'getContentPath').returns('content/images/');
        });

        afterEach(function () {
            path.sep = truePathSep;
        });

        it('should return url in proper format for windows', function (done) {
            path.sep = '\\';
            pathJoinStub.returns('content\\images\\2013\\09\\IMAGE.jpg');

            localFileStore.save(image).then(function (url) {
                if (truePathSep === '\\') {
                    assert.equal(url, '/content/images/2013/09/IMAGE.jpg');
                } else {
                    // if this unit test is run on an OS that uses forward slash separators,
                    // localfilesystem.save() will use a path.relative() call on
                    // one path with backslash separators and one path with forward
                    // slashes and it returns a path that needs to be normalized
                    assert.equal(path.normalize(url), '/content/images/2013/09/IMAGE.jpg');
                }

                done();
            }).catch(done);
        });
    });
});
