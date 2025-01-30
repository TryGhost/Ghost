const errors = require('@tryghost/errors');
const sinon = require('sinon');
const fs = require('fs-extra');
const moment = require('moment');
const path = require('path');
const LocalImagesStorage = require('../../../../../core/server/adapters/storage/LocalImagesStorage');
const configUtils = require('../../../../utils/configUtils');
const assert = require('assert').strict;

describe('Local Images Storage', function () {
    let image;
    let momentStub;
    let localFileStore;

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
        sinon.stub(fs, 'mkdirs').resolves();
        sinon.stub(fs, 'copy').resolves();
        sinon.stub(fs, 'stat').rejects();
        sinon.stub(fs, 'unlink').resolves();

        image = {
            path: 'tmp/123456.jpg',
            name: 'IMAGE.jpg',
            type: 'image/jpeg'
        };

        localFileStore = new LocalImagesStorage();

        fakeDate(9, 2013);
    });

    it('sends correct path to image when date is in Sep 2013', async function () {
        const url = await localFileStore.save(image);
        assert.match(url, /content\/images\/2013\/09\/IMAGE-\w{16}\.jpg/);
    });

    it('sends correct path to image when original file has spaces', async function () {
        image.name = 'AN IMAGE.jpg';
        const url = await localFileStore.save(image);
        assert.match(url, /content\/images\/2013\/09\/AN-IMAGE-\w{16}\.jpg/);
    });

    it('allows "@" symbol to image for Apple hi-res (retina) modifier', async function () {
        image.name = 'photo@2x.jpg';
        const url = await localFileStore.save(image);
        assert.match(url, /content\/images\/2013\/09\/photo@2x-\w{16}\.jpg/);
    });

    it('sends correct path to image when date is in Jan 2014', async function () {
        fakeDate(1, 2014);
        const url = await localFileStore.save(image);
        assert.match(url, /content\/images\/2014\/01\/IMAGE-\w{16}\.jpg/);
    });

    it('creates month and year directory', async function () {
        await localFileStore.save(image);
        assert.equal(fs.mkdirs.calledOnce, true);
        assert.equal(fs.mkdirs.args[0][0], path.resolve('./content/images/2013/09'));
    });

    it('copies temp file to new location', async function () {
        await localFileStore.save(image);
        assert.equal(fs.copy.calledOnce, true);
        assert.equal(fs.copy.args[0][0], 'tmp/123456.jpg');

        assert.match(fs.copy.args[0][1], /content\/images\/2013\/09\/IMAGE-\w{16}\.jpg/);
    });

    it('uploads two different images with the same name with different names', async function () {
        const first = await localFileStore.save(image);
        assert.match(first, /content\/images\/2013\/09\/IMAGE-\w{16}\.jpg/);

        const second = await localFileStore.save(image);
        assert.match(second, /content\/images\/2013\/09\/IMAGE-\w{16}\.jpg/);

        assert.notEqual(first, second);
    });

    describe('read image', function () {
        beforeEach(function () {
            // we have some example images in our test utils folder
            localFileStore.storagePath = path.join(__dirname, '../../../../utils/fixtures/images/');
        });

        it('reads image', async function () {
            const bytes = await localFileStore.read({path: 'ghost-logo.png'});
            assert.equal(bytes.length, 8638);
        });

        it('reads image (leading and trailing slashes)', async function () {
            const bytes = await localFileStore.read({path: '/ghost-logo.png/'});
            assert.equal(bytes.length, 8638);
        });

        it('returns error when image does not exist', async function () {
            await assert.rejects(
                localFileStore.read({path: 'does-not-exist.png'}),
                errors.NotFoundError,
                'Expected error to be thrown'
            );
        });
    });

    describe('validate extentions', function () {
        it('saves image with .zip as extension', async function () {
            const url = await localFileStore.save({
                name: 'test-1.1.1.zip'
            });
            assert.match(url, /test-1.1.1-\w{16}\.zip/);
        });

        it('saves image with .jpeg as extension', async function () {
            const url = await localFileStore.save({
                name: 'test-1.1.1.jpeg'
            });
            assert.match(url, /test-1.1.1-\w{16}\.jpeg/);
        });

        it('saves image but ignores invalid extension .0', async function () {
            const url = await localFileStore.save({
                name: 'test-1.1.1.0'
            });
            assert.match(url, /test-1.1.1.0-\w{16}/);
        });
    });

    describe('when a custom content path is used', function () {
        beforeEach(function () {
            const configPaths = configUtils.defaultConfig.paths;
            configUtils.set('paths:contentPath', configPaths.appRoot + '/var/ghostcms');
        });

        it('sends the correct path to image', async function () {
            const url = await localFileStore.save(image);
            assert.match(url, /\/content\/images\/2013\/09\/IMAGE-\w{16}\.jpg/);
        });
    });

    // @TODO: remove path.join mock...
    describe('on Windows', function () {
        const truePathSep = path.sep;

        beforeEach(function () {
            sinon.stub(path, 'join');
            sinon.stub(configUtils.config, 'getContentPath').returns('content/images/');
        });

        afterEach(function () {
            path.sep = truePathSep;
        });

        it('returns url in proper format for windows', async function () {
            path.sep = '\\';
            path.join.returns('content\\images\\2013\\09\\IMAGE.jpg');

            const url = await localFileStore.save(image);
            if (truePathSep === '\\') {
                assert.equal(url, '/content/images/2013/09/IMAGE.jpg');
            } else {
                // if this unit test is run on an OS that uses forward slash separators,
                // localfilesystem.save() will use a path.relative() call on
                // one path with backslash separators and one path with forward
                // slashes and it returns a path that needs to be normalized
                assert.equal(path.normalize(url), '/content/images/2013/09/IMAGE.jpg');
            }
        });
    });
});
