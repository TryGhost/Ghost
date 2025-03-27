const _ = require('lodash');
const sinon = require('sinon');

const ContentFileImporter = require('../../../../../../core/server/data/importer/importers/ContentFileImporter');

describe('ContentFileImporter', function () {
    afterEach(function () {
        sinon.restore();
    });

    it('has the correct interface', function () {
        const imageImporter = new ContentFileImporter({
            type: 'images',
            store: {}
        });
        imageImporter.type.should.eql('images');
        imageImporter.preProcess.should.be.instanceof(Function);
        imageImporter.doImport.should.be.instanceof(Function);
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

        inputData.posts[0].markdown.should.not.containEql('/content/images/my-image.png');
        inputData.posts[0].html.should.not.containEql('/content/images/my-image.png');
        outputData.posts[0].markdown.should.containEql('/content/images/my-image.png');
        outputData.posts[0].html.should.containEql('/content/images/my-image.png');

        inputData.posts[0].markdown.should.not.containEql('/content/images/photos/cat.jpg');
        inputData.posts[0].html.should.not.containEql('/content/images/photos/cat.jpg');
        outputData.posts[0].markdown.should.containEql('/content/images/photos/cat.jpg');
        outputData.posts[0].html.should.containEql('/content/images/photos/cat.jpg');

        inputData.posts[0].feature_image.should.eql('/images/my-image.png');
        outputData.posts[0].feature_image.should.eql('/content/images/my-image.png');

        inputData.tags[0].feature_image.should.eql('/images/my-image.png');
        outputData.tags[0].feature_image.should.eql('/content/images/my-image.png');

        inputData.users[0].profile_image.should.eql('/images/my-image.png');
        inputData.users[0].cover_image.should.eql('/images/photos/cat.jpg');
        outputData.users[0].profile_image.should.eql('/content/images/my-image.png');
        outputData.users[0].cover_image.should.eql('/content/images/photos/cat.jpg');
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

        storageApi.save.calledTwice.should.be.true();
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

        storageApi.save.calledOnce.should.be.true();
        storageApi.save.args[0][0].name.should.eql('best-memes.pdf');
        storageApi.save.args[0][0].newPath.should.eql('/content/files/best-memes.pdf');
    });
});
