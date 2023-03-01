const _ = require('lodash');
const sinon = require('sinon');

const storage = require('../../../../../../core/server/adapters/storage');
const ImageImporter = require('../../../../../../core/server/data/importer/importers/image');

describe('ImageImporter', function () {
    it('has the correct interface', function () {
        ImageImporter.type.should.eql('images');
        ImageImporter.preProcess.should.be.instanceof(Function);
        ImageImporter.doImport.should.be.instanceof(Function);
    });

    it('does preprocess posts, users and tags correctly', function () {
        let inputData = require('../../../../../utils/fixtures/import/import-data-1.json');
        let outputData = ImageImporter.preProcess(_.cloneDeep(inputData));

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

    it('does import the images correctly', function () {
        const inputData = require('../../../../../utils/fixtures/import/import-data-1.json');

        const storageApi = {
            save: sinon.stub().returns(Promise.resolve())
        };

        const storageSpy = sinon.stub(storage, 'getStorage').callsFake(function () {
            return storageApi;
        });

        ImageImporter.doImport(inputData.images).then(function () {
            storageSpy.calledOnce.should.be.true();
            storageApi.save.calledTwice.should.be.true();
        });
    });
});
