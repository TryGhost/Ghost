const assert = require('node:assert/strict');
const sinon = require('sinon');
const _ = require('lodash');

const ImageHandler = require('../../../../../../core/server/data/importer/handlers/image');
const storage = require('../../../../../../core/server/adapters/storage');
const configUtils = require('../../../../../utils/config-utils');

describe('ImageHandler', function () {
    const store = storage.getStorage('images');

    afterEach(async function () {
        sinon.restore();
        await configUtils.restore();
    });

    it('has the correct interface', function () {
        assert.equal(ImageHandler.type, 'images');
        assert(Array.isArray(ImageHandler.extensions));
        assert.equal(ImageHandler.extensions.length, 8);
        assert(ImageHandler.extensions.includes('.jpg'));
        assert(ImageHandler.extensions.includes('.jpeg'));
        assert(ImageHandler.extensions.includes('.gif'));
        assert(ImageHandler.extensions.includes('.png'));
        assert(ImageHandler.extensions.includes('.svg'));
        assert(ImageHandler.extensions.includes('.svgz'));
        assert(ImageHandler.extensions.includes('.ico'));
        assert(ImageHandler.extensions.includes('.webp'));
        assert(Array.isArray(ImageHandler.contentTypes));
        assert.equal(ImageHandler.contentTypes.length, 7);
        assert(ImageHandler.contentTypes.includes('image/jpeg'));
        assert(ImageHandler.contentTypes.includes('image/png'));
        assert(ImageHandler.contentTypes.includes('image/gif'));
        assert(ImageHandler.contentTypes.includes('image/svg+xml'));
        assert(ImageHandler.contentTypes.includes('image/x-icon'));
        assert(ImageHandler.contentTypes.includes('image/vnd.microsoft.icon'));
        assert(ImageHandler.contentTypes.includes('image/webp'));
        assert.equal(typeof ImageHandler.loadFile, 'function');
    });

    it('can load a single file', function (done) {
        const filename = 'test-image.jpeg';

        const file = [{
            path: '/my/test/' + filename,
            name: filename
        }];

        const storeSpy = sinon.spy(store, 'getUniqueFileName');
        const storageSpy = sinon.spy(storage, 'getStorage');

        ImageHandler.loadFile(_.clone(file)).then(function () {
            assert.equal(storageSpy.calledOnce, true);
            assert.equal(storeSpy.calledOnce, true);
            assert.equal(storeSpy.firstCall.args[0].originalPath, 'test-image.jpeg');
            assert.match(storeSpy.firstCall.args[0].targetDir, /(\/|\\)content(\/|\\)images$/);
            assert.equal(storeSpy.firstCall.args[0].newPath, '/content/images/test-image.jpeg');

            done();
        }).catch(done);
    });

    it('can load a single file, maintaining structure', function (done) {
        const filename = 'photos/my-cat.jpeg';

        const file = [{
            path: '/my/test/' + filename,
            name: filename
        }];

        const storeSpy = sinon.spy(store, 'getUniqueFileName');
        const storageSpy = sinon.spy(storage, 'getStorage');

        ImageHandler.loadFile(_.clone(file)).then(function () {
            assert.equal(storageSpy.calledOnce, true);
            assert.equal(storeSpy.calledOnce, true);
            assert.equal(storeSpy.firstCall.args[0].originalPath, 'photos/my-cat.jpeg');
            assert.match(storeSpy.firstCall.args[0].targetDir, /(\/|\\)content(\/|\\)images(\/|\\)photos$/);
            assert.equal(storeSpy.firstCall.args[0].newPath, '/content/images/photos/my-cat.jpeg');

            done();
        }).catch(done);
    });

    it('can load a single file, removing ghost dirs', function (done) {
        const filename = 'content/images/my-cat.jpeg';

        const file = [{
            path: '/my/test/content/images/' + filename,
            name: filename
        }];

        const storeSpy = sinon.spy(store, 'getUniqueFileName');
        const storageSpy = sinon.spy(storage, 'getStorage');

        ImageHandler.loadFile(_.clone(file)).then(function () {
            assert.equal(storageSpy.calledOnce, true);
            assert.equal(storeSpy.calledOnce, true);
            assert.equal(storeSpy.firstCall.args[0].originalPath, 'content/images/my-cat.jpeg');
            assert.match(storeSpy.firstCall.args[0].targetDir, /(\/|\\)content(\/|\\)images$/);
            assert.equal(storeSpy.firstCall.args[0].newPath, '/content/images/my-cat.jpeg');

            done();
        }).catch(done);
    });

    it('can load a file (subdirectory)', function (done) {
        configUtils.set({url: 'http://localhost:65535/subdir'});

        const filename = 'test-image.jpeg';

        const file = [{
            path: '/my/test/' + filename,
            name: filename
        }];

        const storeSpy = sinon.spy(store, 'getUniqueFileName');
        const storageSpy = sinon.spy(storage, 'getStorage');

        ImageHandler.loadFile(_.clone(file)).then(function () {
            assert.equal(storageSpy.calledOnce, true);
            assert.equal(storeSpy.calledOnce, true);
            assert.equal(storeSpy.firstCall.args[0].originalPath, 'test-image.jpeg');
            assert.match(storeSpy.firstCall.args[0].targetDir, /(\/|\\)content(\/|\\)images$/);
            assert.equal(storeSpy.firstCall.args[0].newPath, '/subdir/content/images/test-image.jpeg');

            done();
        }).catch(done);
    });

    it('can load multiple files', function (done) {
        const files = [{
            path: '/my/test/testing.png',
            name: 'testing.png'
        },
        {
            path: '/my/test/photo/kitten.jpg',
            name: 'photo/kitten.jpg'
        },
        {
            path: '/my/test/content/images/animated/bunny.gif',
            name: 'content/images/animated/bunny.gif'
        },
        {
            path: '/my/test/images/puppy.jpg',
            name: 'images/puppy.jpg'
        }];

        const storeSpy = sinon.spy(store, 'getUniqueFileName');
        const storageSpy = sinon.spy(storage, 'getStorage');

        ImageHandler.loadFile(_.clone(files)).then(function () {
            assert.equal(storageSpy.calledOnce, true);
            assert.equal(storeSpy.callCount, 4);
            assert.equal(storeSpy.firstCall.args[0].originalPath, 'testing.png');
            assert.match(storeSpy.firstCall.args[0].targetDir, /(\/|\\)content(\/|\\)images$/);
            assert.equal(storeSpy.firstCall.args[0].newPath, '/content/images/testing.png');
            assert.equal(storeSpy.secondCall.args[0].originalPath, 'photo/kitten.jpg');
            assert.match(storeSpy.secondCall.args[0].targetDir, /(\/|\\)content(\/|\\)images(\/|\\)photo$/);
            assert.equal(storeSpy.secondCall.args[0].newPath, '/content/images/photo/kitten.jpg');
            assert.equal(storeSpy.thirdCall.args[0].originalPath, 'content/images/animated/bunny.gif');
            assert.match(storeSpy.thirdCall.args[0].targetDir, /(\/|\\)content(\/|\\)images(\/|\\)animated$/);
            assert.equal(storeSpy.thirdCall.args[0].newPath, '/content/images/animated/bunny.gif');
            assert.equal(storeSpy.lastCall.args[0].originalPath, 'images/puppy.jpg');
            assert.match(storeSpy.lastCall.args[0].targetDir, /(\/|\\)content(\/|\\)images$/);
            assert.equal(storeSpy.lastCall.args[0].newPath, '/content/images/puppy.jpg');

            done();
        }).catch(done);
    });
});
