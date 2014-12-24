/*globals describe, afterEach, it*/
/*jshint expr:true*/
var should    = require('should'),
    sinon     = require('sinon'),
    Promise   = require('bluebird'),
    _         = require('lodash'),
    testUtils = require('../utils'),
    config    = require('../../server/config'),

    // Stuff we are testing
    ImportManager = require('../../server/data/importer'),
    JSONHandler   = require('../../server/data/importer/handlers/json'),
    ImageHandler   = require('../../server/data/importer/handlers/image'),
    DataImporter  = require('../../server/data/importer/importers/data'),
    ImageImporter  = require('../../server/data/importer/importers/image'),

    sandbox = sinon.sandbox.create(),
    storage = require('../../server/storage');

// To stop jshint complaining
should.equal(true, true);

describe('Importer', function () {
    afterEach(function () {
        sandbox.restore();
    });

    describe('ImportManager', function () {
        it('has the correct interface', function () {
            ImportManager.handlers.should.be.instanceof(Array).and.have.lengthOf(2);
            ImportManager.importers.should.be.instanceof(Array).and.have.lengthOf(2);
            ImportManager.loadFile.should.be.instanceof(Function);
            ImportManager.preProcess.should.be.instanceof(Function);
            ImportManager.doImport.should.be.instanceof(Function);
            ImportManager.generateReport.should.be.instanceof(Function);
        });

        it('gets the correct extensions', function () {
            ImportManager.getExtensions().should.be.instanceof(Array).and.have.lengthOf(8);
            ImportManager.getExtensions().should.containEql('.json');
            ImportManager.getExtensions().should.containEql('.zip');
            ImportManager.getExtensions().should.containEql('.jpg');
        });

        it('gets the correct types', function () {
            ImportManager.getTypes().should.be.instanceof(Array).and.have.lengthOf(8);
            ImportManager.getTypes().should.containEql('application/octet-stream');
            ImportManager.getTypes().should.containEql('application/json');
            ImportManager.getTypes().should.containEql('application/zip');
            ImportManager.getTypes().should.containEql('application/x-zip-compressed');
        });

        it('globs extensions correctly', function () {
            ImportManager.getGlobPattern(JSONHandler).should.equal('**/*+(.json)');
        });

        // Step 1 of importing is loadFile
        describe('loadFile', function () {
            it('knows when to process a file', function (done) {
                var testFile = {name: 'myFile.json', path: '/my/path/myFile.json'},
                    zipSpy = sandbox.stub(ImportManager, 'processZip').returns(Promise.resolve()),
                    fileSpy = sandbox.stub(ImportManager, 'processFile').returns(Promise.resolve()),
                    cleanSpy = sandbox.stub(ImportManager, 'cleanUp').returns(Promise.resolve());

                ImportManager.loadFile(testFile).then(function () {
                    zipSpy.calledOnce.should.be.false;
                    fileSpy.calledOnce.should.be.true;
                    cleanSpy.calledOnce.should.be.true;
                    done();
                });
            });

            // We need to make sure we don't actually extract a zip and leave temporary files everywhere!
            it('knows when to process a zip', function (done) {
                var testZip = {name: 'myFile.zip', path: '/my/path/myFile.zip'},
                    zipSpy = sandbox.stub(ImportManager, 'processZip').returns(Promise.resolve()),
                    fileSpy = sandbox.stub(ImportManager, 'processFile').returns(Promise.resolve()),
                    cleanSpy = sandbox.stub(ImportManager, 'cleanUp').returns(Promise.resolve());

                ImportManager.loadFile(testZip).then(function () {
                    zipSpy.calledOnce.should.be.true;
                    fileSpy.calledOnce.should.be.false;
                    cleanSpy.calledOnce.should.be.true;
                    done();
                });
            });

            it('has same result for zips and files', function (done) {
                var testFile = {name: 'myFile.json', path: '/my/path/myFile.json'},
                    testZip = {name: 'myFile.zip', path: '/my/path/myFile.zip'},
                    // need to stub out the extract and glob function for zip
                    extractSpy = sandbox.stub(ImportManager, 'extractZip').returns(Promise.resolve('/tmp/dir/')),
                    getFileSpy = sandbox.stub(ImportManager, 'getFilesFromZip'),
                    jsonSpy = sandbox.stub(JSONHandler, 'loadFile').returns(Promise.resolve({posts: []})),
                    imageSpy = sandbox.stub(ImageHandler, 'loadFile'),
                    cleanSpy = sandbox.stub(ImportManager, 'cleanUp').returns(Promise.resolve());

                getFileSpy.withArgs(JSONHandler).returns(['/tmp/dir/myFile.json']);
                getFileSpy.withArgs(ImageHandler).returns([]);

                ImportManager.processZip(testZip).then(function (zipResult) {
                    extractSpy.calledOnce.should.be.true;
                    getFileSpy.calledTwice.should.be.true;
                    jsonSpy.calledOnce.should.be.true;
                    imageSpy.called.should.be.false;
                    cleanSpy.calledOnce.should.be.true;

                    ImportManager.processFile(testFile, '.json').then(function (fileResult) {
                        jsonSpy.calledTwice.should.be.true;

                        // They should both have data keys, and they should be equivalent
                        zipResult.should.have.property('data');
                        fileResult.should.have.property('data');
                        zipResult.should.eql(fileResult);
                        done();
                    });
                });
            });
        });

        // Step 2 of importing is preProcess
        describe('preProcess', function () {
            // preProcess can modify the data prior to importing
            it('calls the DataImporter preProcess method', function (done) {
                var input = {data: {}, images: []},
                    // pass a copy so that input doesn't get modified
                    inputCopy = _.cloneDeep(input),
                    dataSpy = sandbox.spy(DataImporter, 'preProcess');

                ImportManager.preProcess(inputCopy).then(function (output) {
                    dataSpy.calledOnce.should.be.true;
                    dataSpy.calledWith(inputCopy).should.be.true;
                    // eql checks for equality
                    // equal checks the references are for the same object
                    output.should.not.equal(input);
                    output.should.have.property('preProcessedByData', true);
                    done();
                });
            });
        });

        // Step 3 of importing is doImport
        describe('doImport', function () {
            // doImport calls the real importers and has an effect on the DB. We don't want any of those calls to be made,
            // but to test that the right calls would be made
            it('calls the DataImporter doImport method with the data object', function (done) {
                var input = {data: {posts: []}, images: []},
                    // pass a copy so that input doesn't get modified
                    inputCopy = _.cloneDeep(input),
                    dataSpy = sandbox.stub(DataImporter, 'doImport', function (i) {
                        return Promise.resolve(i);
                    }),
                    imageSpy = sandbox.stub(ImageImporter, 'doImport', function (i) {
                        return Promise.resolve(i);
                    }),

                    // The data importer should get the data object
                    expectedData = input.data,
                    expectedImages = input.images;

                ImportManager.doImport(inputCopy).then(function (output) {
                    // eql checks for equality
                    // equal checks the references are for the same object
                    dataSpy.calledOnce.should.be.true;
                    imageSpy.calledOnce.should.be.true;
                    dataSpy.getCall(0).args[0].should.eql(expectedData);
                    imageSpy.getCall(0).args[0].should.eql(expectedImages);

                    // we stubbed this as a noop but ImportManager calls with sequence, so we should get an array
                    output.should.eql([expectedImages, expectedData]);
                    done();
                });
            });
        });

        // Step 4 of importing is generateReport
        describe('generateReport', function () {
            // generateReport is intended to create a message to show to the user about what has been imported
            // it is currently a noop
            it('is currently a noop', function (done) {
                var input = {data: {}, images: []};
                ImportManager.generateReport(input).then(function (output) {
                    output.should.equal(input);
                    done();
                });
            });
        });
    });

    describe('JSONHandler', function () {
        it('has the correct interface', function () {
            JSONHandler.type.should.eql('data');
            JSONHandler.extensions.should.be.instanceof(Array).and.have.lengthOf(1);
            JSONHandler.extensions.should.containEql('.json');
            JSONHandler.types.should.be.instanceof(Array).and.have.lengthOf(2);
            JSONHandler.types.should.containEql('application/octet-stream');
            JSONHandler.types.should.containEql('application/json');
            JSONHandler.loadFile.should.be.instanceof(Function);
        });

        it('correctly handles a valid db api wrapper', function (done) {
            var file = [{
                path: testUtils.fixtures.getExportFixturePath('export-003-api-wrapper'),
                name: 'export-003-api-wrapper.json'
            }];
            JSONHandler.loadFile(file).then(function (result) {
                _.keys(result).should.containEql('meta');
                _.keys(result).should.containEql('data');
                done();
            });
        });

        it('correctly errors when given a bad db api wrapper', function (done) {
            var file = [{
                path: testUtils.fixtures.getExportFixturePath('export-003-api-wrapper-bad'),
                name: 'export-003-api-wrapper-bad.json'
            }];

            JSONHandler.loadFile(file).then(function () {
                done(new Error('Didn\'t error for bad db api wrapper'));
            }).catch(function (response) {
                response.type.should.equal('BadRequestError');
                done();
            });
        });
    });

    describe('ImageHandler', function () {
        var origConfig = _.cloneDeep(config),
            storage = require('../../server/storage'),
            store = storage.getStorage();

        afterEach(function () {
            config.set(_.merge({}, origConfig));
        });

        it('has the correct interface', function () {
            ImageHandler.type.should.eql('images');
            ImageHandler.extensions.should.be.instanceof(Array).and.have.lengthOf(6);
            ImageHandler.extensions.should.containEql('.jpg');
            ImageHandler.extensions.should.containEql('.jpeg');
            ImageHandler.extensions.should.containEql('.gif');
            ImageHandler.extensions.should.containEql('.png');
            ImageHandler.extensions.should.containEql('.svg');
            ImageHandler.extensions.should.containEql('.svgz');
            ImageHandler.types.should.be.instanceof(Array).and.have.lengthOf(4);
            ImageHandler.types.should.containEql('image/jpeg');
            ImageHandler.types.should.containEql('image/png');
            ImageHandler.types.should.containEql('image/gif');
            ImageHandler.types.should.containEql('image/svg+xml');
            ImageHandler.loadFile.should.be.instanceof(Function);
        });

        it('can load a single file', function (done) {
            var filename = 'test-image.jpeg',
                file = [{
                    path: '/my/test/' + filename,
                    name: filename
                }],
                storeSpy = sandbox.spy(store, 'getUniqueFileName'),
                storageSpy = sandbox.spy(storage, 'getStorage');

            ImageHandler.loadFile(_.clone(file)).then(function () {
                storageSpy.calledOnce.should.be.true;
                storeSpy.calledOnce.should.be.true;
                storeSpy.firstCall.args[1].originalPath.should.equal('test-image.jpeg');
                storeSpy.firstCall.args[1].targetDir.should.match(/\/content\/images$/);
                storeSpy.firstCall.args[1].newPath.should.eql('/content/images/test-image.jpeg');

                done();
            });
        });

        it('can load a single file, maintaining structure', function (done) {
            var filename = 'photos/my-cat.jpeg',
                file = [{
                    path: '/my/test/' + filename,
                    name: filename
                }],
                storeSpy = sandbox.spy(store, 'getUniqueFileName'),
                storageSpy = sandbox.spy(storage, 'getStorage');

            ImageHandler.loadFile(_.clone(file)).then(function () {
                storageSpy.calledOnce.should.be.true;
                storeSpy.calledOnce.should.be.true;
                storeSpy.firstCall.args[1].originalPath.should.equal('photos/my-cat.jpeg');
                storeSpy.firstCall.args[1].targetDir.should.match(/\/content\/images\/photos$/);
                storeSpy.firstCall.args[1].newPath.should.eql('/content/images/photos/my-cat.jpeg');

                done();
            });
        });

        it('can load a single file, removing ghost dirs', function (done) {
            var filename = 'content/images/my-cat.jpeg',
                file = [{
                    path: '/my/test/content/images/' + filename,
                    name: filename
                }],
                storeSpy = sandbox.spy(store, 'getUniqueFileName'),
                storageSpy = sandbox.spy(storage, 'getStorage');

            ImageHandler.loadFile(_.clone(file)).then(function () {
                storageSpy.calledOnce.should.be.true;
                storeSpy.calledOnce.should.be.true;
                storeSpy.firstCall.args[1].originalPath.should.equal('content/images/my-cat.jpeg');
                storeSpy.firstCall.args[1].targetDir.should.match(/\/content\/images$/);
                storeSpy.firstCall.args[1].newPath.should.eql('/content/images/my-cat.jpeg');

                done();
            });
        });

        it('can load a file (subdirectory)', function (done) {
            config.set({url: 'http://testurl.com/subdir'});

            var filename = 'test-image.jpeg',
                file = [{
                    path: '/my/test/' + filename,
                    name: filename
                }],
                storeSpy = sandbox.spy(store, 'getUniqueFileName'),
                storageSpy = sandbox.spy(storage, 'getStorage');

            ImageHandler.loadFile(_.clone(file)).then(function () {
                storageSpy.calledOnce.should.be.true;
                storeSpy.calledOnce.should.be.true;
                storeSpy.firstCall.args[1].originalPath.should.equal('test-image.jpeg');
                storeSpy.firstCall.args[1].targetDir.should.match(/\/content\/images$/);
                storeSpy.firstCall.args[1].newPath.should.eql('/subdir/content/images/test-image.jpeg');

                done();
            });
        });

        it('can load multiple files', function (done) {
            var files = [{
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
                }],
                storeSpy = sandbox.spy(store, 'getUniqueFileName'),
                storageSpy = sandbox.spy(storage, 'getStorage');

            ImageHandler.loadFile(_.clone(files)).then(function () {
                storageSpy.calledOnce.should.be.true;
                storeSpy.callCount.should.eql(4);
                storeSpy.firstCall.args[1].originalPath.should.equal('testing.png');
                storeSpy.firstCall.args[1].targetDir.should.match(/\/content\/images$/);
                storeSpy.firstCall.args[1].newPath.should.eql('/content/images/testing.png');
                storeSpy.secondCall.args[1].originalPath.should.equal('photo/kitten.jpg');
                storeSpy.secondCall.args[1].targetDir.should.match(/\/content\/images\/photo$/);
                storeSpy.secondCall.args[1].newPath.should.eql('/content/images/photo/kitten.jpg');
                storeSpy.thirdCall.args[1].originalPath.should.equal('content/images/animated/bunny.gif');
                storeSpy.thirdCall.args[1].targetDir.should.match(/\/content\/images\/animated$/);
                storeSpy.thirdCall.args[1].newPath.should.eql('/content/images/animated/bunny.gif');
                storeSpy.lastCall.args[1].originalPath.should.equal('images/puppy.jpg');
                storeSpy.lastCall.args[1].targetDir.should.match(/\/content\/images$/);
                storeSpy.lastCall.args[1].newPath.should.eql('/content/images/puppy.jpg');

                done();
            });
        });
    });

    describe('DataImporter', function () {
        it('has the correct interface', function () {
            DataImporter.type.should.eql('data');
            DataImporter.preProcess.should.be.instanceof(Function);
            DataImporter.doImport.should.be.instanceof(Function);
        });
    });

    describe('ImageImporter', function () {
        it('has the correct interface', function () {
            ImageImporter.type.should.eql('images');
            ImageImporter.preProcess.should.be.instanceof(Function);
            ImageImporter.doImport.should.be.instanceof(Function);
        });

        it('does preprocess posts correctly', function () {
            var inputData = require('../utils/fixtures/import/import-data-1.json'),
                outputData = ImageImporter.preProcess(_.cloneDeep(inputData));

            inputData.data.data.posts[0].markdown.should.not.containEql('/content/images/my-image.png');
            inputData.data.data.posts[0].html.should.not.containEql('/content/images/my-image.png');
            outputData.data.data.posts[0].markdown.should.containEql('/content/images/my-image.png');
            outputData.data.data.posts[0].html.should.containEql('/content/images/my-image.png');

            inputData.data.data.posts[0].markdown.should.not.containEql('/content/images/photos/cat.jpg');
            inputData.data.data.posts[0].html.should.not.containEql('/content/images/photos/cat.jpg');
            outputData.data.data.posts[0].markdown.should.containEql('/content/images/photos/cat.jpg');
            outputData.data.data.posts[0].html.should.containEql('/content/images/photos/cat.jpg');

            inputData.data.data.posts[0].image.should.eql('/images/my-image.png');
            outputData.data.data.posts[0].image.should.eql('/content/images/my-image.png');
        });

        it('does import the images correctly', function () {
            var inputData = require('../utils/fixtures/import/import-data-1.json'),
                storageApi = {
                    save: sandbox.stub().returns(Promise.resolve())
                },
                storageSpy  = sandbox.stub(storage, 'getStorage', function () {
                    return storageApi;
                });

            ImageImporter.doImport(inputData.images).then(function () {
                storageSpy.calledOnce.should.be.true;
                storageApi.save.calledTwice.should.be.true;
            });
        });
    });
});
