const sinon = require('sinon');
const _ = require('lodash');

const ImageHandler = require('../../../../../../core/server/data/importer/handlers/image');
const storage = require('../../../../../../core/server/adapters/storage');
const configUtils = require('../../../../../utils/configUtils');

describe('ImageHandler', function () {
    const store = storage.getStorage('images');

    afterEach(async function () {
        sinon.restore();
        await configUtils.restore();
    });

    it('has the correct interface', function () {
        ImageHandler.type.should.eql('images');
        ImageHandler.extensions.should.be.instanceof(Array).and.have.lengthOf(8);
        ImageHandler.extensions.should.containEql('.jpg');
        ImageHandler.extensions.should.containEql('.jpeg');
        ImageHandler.extensions.should.containEql('.gif');
        ImageHandler.extensions.should.containEql('.png');
        ImageHandler.extensions.should.containEql('.svg');
        ImageHandler.extensions.should.containEql('.svgz');
        ImageHandler.extensions.should.containEql('.ico');
        ImageHandler.extensions.should.containEql('.webp');
        ImageHandler.contentTypes.should.be.instanceof(Array).and.have.lengthOf(7);
        ImageHandler.contentTypes.should.containEql('image/jpeg');
        ImageHandler.contentTypes.should.containEql('image/png');
        ImageHandler.contentTypes.should.containEql('image/gif');
        ImageHandler.contentTypes.should.containEql('image/svg+xml');
        ImageHandler.contentTypes.should.containEql('image/x-icon');
        ImageHandler.contentTypes.should.containEql('image/vnd.microsoft.icon');
        ImageHandler.contentTypes.should.containEql('image/webp');
        ImageHandler.loadFile.should.be.instanceof(Function);
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
            storageSpy.calledOnce.should.be.true();
            storeSpy.calledOnce.should.be.true();
            storeSpy.firstCall.args[0].originalPath.should.equal('test-image.jpeg');
            storeSpy.firstCall.args[0].targetDir.should.match(/(\/|\\)content(\/|\\)images$/);
            storeSpy.firstCall.args[0].newPath.should.eql('/content/images/test-image.jpeg');

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
            storageSpy.calledOnce.should.be.true();
            storeSpy.calledOnce.should.be.true();
            storeSpy.firstCall.args[0].originalPath.should.equal('photos/my-cat.jpeg');
            storeSpy.firstCall.args[0].targetDir.should.match(/(\/|\\)content(\/|\\)images(\/|\\)photos$/);
            storeSpy.firstCall.args[0].newPath.should.eql('/content/images/photos/my-cat.jpeg');

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
            storageSpy.calledOnce.should.be.true();
            storeSpy.calledOnce.should.be.true();
            storeSpy.firstCall.args[0].originalPath.should.equal('content/images/my-cat.jpeg');
            storeSpy.firstCall.args[0].targetDir.should.match(/(\/|\\)content(\/|\\)images$/);
            storeSpy.firstCall.args[0].newPath.should.eql('/content/images/my-cat.jpeg');

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
            storageSpy.calledOnce.should.be.true();
            storeSpy.calledOnce.should.be.true();
            storeSpy.firstCall.args[0].originalPath.should.equal('test-image.jpeg');
            storeSpy.firstCall.args[0].targetDir.should.match(/(\/|\\)content(\/|\\)images$/);
            storeSpy.firstCall.args[0].newPath.should.eql('/subdir/content/images/test-image.jpeg');

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
            storageSpy.calledOnce.should.be.true();
            storeSpy.callCount.should.eql(4);
            storeSpy.firstCall.args[0].originalPath.should.equal('testing.png');
            storeSpy.firstCall.args[0].targetDir.should.match(/(\/|\\)content(\/|\\)images$/);
            storeSpy.firstCall.args[0].newPath.should.eql('/content/images/testing.png');
            storeSpy.secondCall.args[0].originalPath.should.equal('photo/kitten.jpg');
            storeSpy.secondCall.args[0].targetDir.should.match(/(\/|\\)content(\/|\\)images(\/|\\)photo$/);
            storeSpy.secondCall.args[0].newPath.should.eql('/content/images/photo/kitten.jpg');
            storeSpy.thirdCall.args[0].originalPath.should.equal('content/images/animated/bunny.gif');
            storeSpy.thirdCall.args[0].targetDir.should.match(/(\/|\\)content(\/|\\)images(\/|\\)animated$/);
            storeSpy.thirdCall.args[0].newPath.should.eql('/content/images/animated/bunny.gif');
            storeSpy.lastCall.args[0].originalPath.should.equal('images/puppy.jpg');
            storeSpy.lastCall.args[0].targetDir.should.match(/(\/|\\)content(\/|\\)images$/);
            storeSpy.lastCall.args[0].newPath.should.eql('/content/images/puppy.jpg');

            done();
        }).catch(done);
    });
});
