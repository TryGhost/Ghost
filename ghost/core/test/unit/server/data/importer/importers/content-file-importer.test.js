const assert = require('node:assert/strict');
const _ = require('lodash');
const sinon = require('sinon');

const ContentFileImporter = require('../../../../../../core/server/data/importer/importers/content-file-importer');

describe('ContentFileImporter', function () {
    afterEach(function () {
        sinon.restore();
    });

    it('has the correct interface', function () {
        const imageImporter = new ContentFileImporter({
            type: 'images',
            store: {}
        });
        assert.equal(imageImporter.type, 'images');
        assert.equal(imageImporter.preProcess instanceof Function, true);
        assert.equal(imageImporter.doImport instanceof Function, true);
    });

    it('does preprocess posts, users and tags correctly', function () {
        let inputData = require('../../../../../utils/fixtures/import/import-data-1.json');
        const imageImporter = new ContentFileImporter({
            type: 'images',
            store: {}
        });
        let outputData = imageImporter.preProcess(_.cloneDeep(inputData));

        inputData = inputData.data.data;
        outputData = outputData.data.data;

        assert.equal(inputData.posts[0].markdown.includes('/content/images/my-image.png'), false);
        assert.equal(inputData.posts[0].html.includes('/content/images/my-image.png'), false);
        assert.equal(outputData.posts[0].markdown.includes('/content/images/my-image.png'), true);
        assert.equal(outputData.posts[0].html.includes('/content/images/my-image.png'), true);

        assert.equal(inputData.posts[0].markdown.includes('/content/images/photos/cat.jpg'), false);
        assert.equal(inputData.posts[0].html.includes('/content/images/photos/cat.jpg'), false);
        assert.equal(outputData.posts[0].markdown.includes('/content/images/photos/cat.jpg'), true);
        assert.equal(outputData.posts[0].html.includes('/content/images/photos/cat.jpg'), true);

        assert.equal(inputData.posts[0].feature_image, '/images/my-image.png');
        assert.equal(outputData.posts[0].feature_image, '/content/images/my-image.png');

        assert.equal(inputData.tags[0].feature_image, '/images/my-image.png');
        assert.equal(outputData.tags[0].feature_image, '/content/images/my-image.png');

        assert.equal(inputData.users[0].profile_image, '/images/my-image.png');
        assert.equal(inputData.users[0].cover_image, '/images/photos/cat.jpg');
        assert.equal(outputData.users[0].profile_image, '/content/images/my-image.png');
        assert.equal(outputData.users[0].cover_image, '/content/images/photos/cat.jpg');
    });

    it('does import the images correctly', async function () {
        const inputData = require('../../../../../utils/fixtures/import/import-data-1.json');
        const storageApi = {
            save: sinon.stub().returns(Promise.resolve())
        };
        const imageImporter = new ContentFileImporter({
            store: storageApi
        });

        await imageImporter.doImport(inputData.images);

        sinon.assert.calledTwice(storageApi.save);
    });

    it('does import the files correctly', async function () {
        const inputData = require('../../../../../utils/fixtures/import/import-data-1.json');
        const storageApi = {
            save: sinon.stub().returns(Promise.resolve())
        };
        const imageImporter = new ContentFileImporter({
            store: storageApi
        });

        await imageImporter.doImport(inputData.files);

        sinon.assert.calledOnce(storageApi.save);
        assert.equal(storageApi.save.args[0][0].name, 'best-memes.pdf');
        assert.equal(storageApi.save.args[0][0].newPath, '/content/files/best-memes.pdf');
    });

    describe('doImport with CDN storage', function () {
        it('stores CDN URL returned by save() in the result.stored field', async function () {
            const images = [
                {
                    name: 'photo.png',
                    path: '/tmp/photo.png',
                    originalPath: 'images/photo.png',
                    targetDir: '/test/content/images',
                    newPath: '/content/images/photo.png'
                }
            ];
            const storageApi = {
                save: sinon.stub().resolves('https://storage.ghost.is/c/6f/a3/site/content/images/photo.png')
            };
            const imageImporter = new ContentFileImporter({
                type: 'images',
                store: storageApi
            });

            const result = await imageImporter.doImport(images);

            sinon.assert.calledOnce(storageApi.save);
            assert.equal(result[0].originalPath, 'images/photo.png');
            assert.equal(result[0].newPath, '/content/images/photo.png');
            assert.equal(result[0].stored, 'https://storage.ghost.is/c/6f/a3/site/content/images/photo.png');
        });

        it('stores relative path returned by save() in the result.stored field (local storage)', async function () {
            const images = [
                {
                    name: 'photo.png',
                    path: '/tmp/photo.png',
                    originalPath: 'images/photo.png',
                    targetDir: '/test/content/images',
                    newPath: '/content/images/photo.png'
                }
            ];
            const storageApi = {
                save: sinon.stub().resolves('/content/images/photo.png')
            };
            const imageImporter = new ContentFileImporter({
                type: 'images',
                store: storageApi
            });

            const result = await imageImporter.doImport(images);

            sinon.assert.calledOnce(storageApi.save);
            assert.equal(result[0].stored, '/content/images/photo.png');
        });
    });
});
