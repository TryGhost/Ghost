import assert from 'node:assert/strict';
import errors from '@tryghost/errors';
import sinon from 'sinon';
import fs from 'fs-extra';
import moment from 'moment';
import path from 'path';
import type {StorageFile} from 'ghost-storage-base';
import type LocalImagesStorageClass from '../../../../../core/server/adapters/storage/LocalImagesStorage';

// Vitest resolves `import` through Vite's SSR module runner and `require`
// through Node's CJS cache, so the same first-party module loaded both ways
// yields two instances with independent state. config-utils is untyped JS and
// has to be required, so the storage adapter reading the config singleton it
// mutates must come from the same `require` graph.
const LocalImagesStorage: typeof LocalImagesStorageClass = require('../../../../../core/server/adapters/storage/LocalImagesStorage').default;
const configUtils = require('../../../../utils/config-utils');
const {assertExists} = require('../../../../utils/assertions');

// Resolve content paths from the ghost/core package root so assertions do not
// assume process.cwd() === ghost/core (the unified `pnpm test:watch` runs from
// the repo root).
const ghostCoreRoot = path.join(__dirname, '../../../../..');

describe('Local Images Storage', function () {
    let image: StorageFile;
    let momentStub: sinon.SinonStub;
    let localFileStore: LocalImagesStorageClass;
    let fsMkdirsStub: sinon.SinonStub;
    let fsCopyStub: sinon.SinonStub;
    let fsStatStub: sinon.SinonStub;

    function fakeDate(month: number, year: number) {
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

    it('should send correct path to image when date is in Sep 2013', async function () {
        const url = await localFileStore.save(image);
        assert.equal(url, '/content/images/2013/09/IMAGE.jpg');
    });

    it('should send correct path to image when original file has spaces', async function () {
        image.name = 'AN IMAGE.jpg';
        const url = await localFileStore.save(image);
        assert.equal(url, '/content/images/2013/09/AN-IMAGE.jpg');
    });

    it('should allow "@" symbol to image for Apple hi-res (retina) modifier', async function () {
        image.name = 'photo@2x.jpg';
        const url = await localFileStore.save(image);
        assert.equal(url, '/content/images/2013/09/photo@2x.jpg');
    });

    it('should send correct path to image when date is in Jan 2014', async function () {
        fakeDate(1, 2014);

        const url = await localFileStore.save(image);
        assert.equal(url, '/content/images/2014/01/IMAGE.jpg');
    });

    it('should create month and year directory', async function () {
        await localFileStore.save(image);
        sinon.assert.calledOnce(fsMkdirsStub);
        assert.equal(fsMkdirsStub.args[0][0], path.resolve(ghostCoreRoot, './content/images/2013/09'));
    });

    it('should copy temp file to new location', async function () {
        await localFileStore.save(image);
        sinon.assert.calledOnce(fsCopyStub);
        assert.equal(fsCopyStub.args[0][0], 'tmp/123456.jpg');
        assert.equal(fsCopyStub.args[0][1], path.resolve(ghostCoreRoot, './content/images/2013/09/IMAGE.jpg'));
    });

    it('can upload two different images with the same name without overwriting the first', async function () {
        fsStatStub.withArgs(path.resolve(ghostCoreRoot, './content/images/2013/09/IMAGE.jpg')).resolves();
        fsStatStub.withArgs(path.resolve(ghostCoreRoot, './content/images/2013/09/IMAGE-1.jpg')).rejects();

        // if on windows need to setup with back slashes
        // doesn't hurt for the test to cope with both
        fsStatStub.withArgs(path.resolve(ghostCoreRoot, '.\\content\\images\\2013\\Sep\\IMAGE.jpg')).resolves();
        fsStatStub.withArgs(path.resolve(ghostCoreRoot, '.\\content\\images\\2013\\Sep\\IMAGE-1.jpg')).rejects();

        const url = await localFileStore.save(image);
        assert.equal(url, '/content/images/2013/09/IMAGE-1.jpg');
    });

    it('can upload five different images with the same name without overwriting the first', async function () {
        fsStatStub.withArgs(path.resolve(ghostCoreRoot, './content/images/2013/09/IMAGE.jpg')).resolves();
        fsStatStub.withArgs(path.resolve(ghostCoreRoot, './content/images/2013/09/IMAGE-1.jpg')).resolves();
        fsStatStub.withArgs(path.resolve(ghostCoreRoot, './content/images/2013/09/IMAGE-2.jpg')).resolves();
        fsStatStub.withArgs(path.resolve(ghostCoreRoot, './content/images/2013/09/IMAGE-3.jpg')).resolves();
        fsStatStub.withArgs(path.resolve(ghostCoreRoot, './content/images/2013/09/IMAGE-4.jpg')).rejects();

        // windows setup
        fsStatStub.withArgs(path.resolve(ghostCoreRoot, '.\\content\\images\\2013\\Sep\\IMAGE.jpg')).resolves();
        fsStatStub.withArgs(path.resolve(ghostCoreRoot, '.\\content\\images\\2013\\Sep\\IMAGE-1.jpg')).resolves();
        fsStatStub.withArgs(path.resolve(ghostCoreRoot, '.\\content\\images\\2013\\Sep\\IMAGE-2.jpg')).resolves();
        fsStatStub.withArgs(path.resolve(ghostCoreRoot, '.\\content\\images\\2013\\Sep\\IMAGE-3.jpg')).resolves();
        fsStatStub.withArgs(path.resolve(ghostCoreRoot, '.\\content\\images\\2013\\Sep\\IMAGE-4.jpg')).rejects();

        const url = await localFileStore.save(image);
        assert.equal(url, '/content/images/2013/09/IMAGE-4.jpg');
    });

    describe('read image', function () {
        beforeEach(function () {
            // we have some example images in our test utils folder
            localFileStore.storagePath = path.join(__dirname, '../../../../utils/fixtures/images/');
        });

        it('success', async function () {
            const bytes = await localFileStore.read({path: 'ghost-logo.png'});
            assert.equal(bytes.length, 8638);
        });

        it('success (leading and trailing slashes)', async function () {
            const bytes = await localFileStore.read({path: '/ghost-logo.png/'});
            assert.equal(bytes.length, 8638);
        });

        it('image does not exist', async function () {
            await assert.rejects(
                localFileStore.read({path: 'does-not-exist.png'}),
                (err: errors.NotFoundError & {code?: string}) => {
                    assert.equal((err instanceof errors.NotFoundError), true);
                    assert.equal(err.code, 'ENOENT');
                    return true;
                }
            );
        });
    });

    describe('validate extentions', function () {
        it('name contains a .\d as extension', async function () {
            const url = await localFileStore.save({
                name: 'test-1.1.1'
            } as StorageFile);
            assertExists(url.match(/test-1.1.1/));
        });

        it('name contains a .zip as extension', async function () {
            const url = await localFileStore.save({
                name: 'test-1.1.1.zip'
            } as StorageFile);
            assertExists(url.match(/test-1.1.1.zip/));
        });

        it('name contains a .jpeg as extension', async function () {
            const url = await localFileStore.save({
                name: 'test-1.1.1.jpeg'
            } as StorageFile);
            assertExists(url.match(/test-1.1.1.jpeg/));
        });
    });

    describe('when a custom content path is used', function () {
        beforeEach(function () {
            const configPaths = configUtils.defaultConfig.paths;
            configUtils.set('paths:contentPath', configPaths.appRoot + '/var/ghostcms');
        });

        it('should send the correct path to image', async function () {
            const url = await localFileStore.save(image);
            assert.equal(url, '/content/images/2013/09/IMAGE.jpg');
        });
    });

    // @TODO: remove path.join mock...
    describe('on Windows', function () {
        const truePathSep = path.sep;
        let pathJoinStub: sinon.SinonStub;

        beforeEach(function () {
            pathJoinStub = sinon.stub(path, 'join');
            sinon.stub(configUtils.config, 'getContentPath').returns('content/images/');
        });

        afterEach(function () {
            (path as {sep: string}).sep = truePathSep;
        });

        it('should return url in proper format for windows', async function () {
            (path as {sep: string}).sep = '\\';
            pathJoinStub.returns('content\\images\\2013\\09\\IMAGE.jpg');

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
