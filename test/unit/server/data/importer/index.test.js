const errors = require('@tryghost/errors');
const should = require('should');
const sinon = require('sinon');
const rewire = require('rewire');
const _ = require('lodash');
const testUtils = require('../../../../utils');
const moment = require('moment');
const path = require('path');
const fs = require('fs-extra');

// Stuff we are testing
const ImportManager = require('../../../../../core/server/data/importer');

const JSONHandler = require('../../../../../core/server/data/importer/handlers/json');
let ImageHandler = rewire('../../../../../core/server/data/importer/handlers/image');
const MarkdownHandler = require('../../../../../core/server/data/importer/handlers/markdown');
const DataImporter = require('../../../../../core/server/data/importer/importers/data');
const ImageImporter = require('../../../../../core/server/data/importer/importers/image');
const storage = require('../../../../../core/server/adapters/storage');
const configUtils = require('../../../../utils/configUtils');

describe('Importer', function () {
    afterEach(function () {
        sinon.restore();
        ImageHandler = rewire('../../../../../core/server/data/importer/handlers/image');
        configUtils.restore();
    });

    describe('ImportManager', function () {
        it('has the correct interface', function () {
            ImportManager.handlers.should.be.instanceof(Array).and.have.lengthOf(3);
            ImportManager.importers.should.be.instanceof(Array).and.have.lengthOf(2);
            ImportManager.loadFile.should.be.instanceof(Function);
            ImportManager.preProcess.should.be.instanceof(Function);
            ImportManager.doImport.should.be.instanceof(Function);
            ImportManager.generateReport.should.be.instanceof(Function);
        });

        it('gets the correct extensions', function () {
            ImportManager.getExtensions().should.be.instanceof(Array).and.have.lengthOf(12);
            ImportManager.getExtensions().should.containEql('.json');
            ImportManager.getExtensions().should.containEql('.zip');
            ImportManager.getExtensions().should.containEql('.jpg');
            ImportManager.getExtensions().should.containEql('.md');
            ImportManager.getExtensions().should.containEql('.webp');
        });

        it('gets the correct types', function () {
            ImportManager.getContentTypes().should.be.instanceof(Array).and.have.lengthOf(12);
            ImportManager.getContentTypes().should.containEql('image/jpeg');
            ImportManager.getContentTypes().should.containEql('image/png');
            ImportManager.getContentTypes().should.containEql('image/gif');
            ImportManager.getContentTypes().should.containEql('image/svg+xml');
            ImportManager.getContentTypes().should.containEql('image/x-icon');
            ImportManager.getContentTypes().should.containEql('image/vnd.microsoft.icon');
            ImportManager.getContentTypes().should.containEql('image/webp');

            ImportManager.getContentTypes().should.containEql('application/octet-stream');
            ImportManager.getContentTypes().should.containEql('application/json');

            ImportManager.getContentTypes().should.containEql('text/plain');

            ImportManager.getContentTypes().should.containEql('application/zip');
            ImportManager.getContentTypes().should.containEql('application/x-zip-compressed');
        });

        it('gets the correct directories', function () {
            ImportManager.getDirectories().should.be.instanceof(Array).and.have.lengthOf(2);
            ImportManager.getDirectories().should.containEql('images');
            ImportManager.getDirectories().should.containEql('content');
        });

        it('globs extensions correctly', function () {
            ImportManager.getGlobPattern(ImportManager.getExtensions())
                .should.equal('+(.jpg|.jpeg|.gif|.png|.svg|.svgz|.ico|.webp|.json|.md|.markdown|.zip)');
            ImportManager.getGlobPattern(ImportManager.getDirectories())
                .should.equal('+(images|content)');
            ImportManager.getGlobPattern(JSONHandler.extensions)
                .should.equal('+(.json)');
            ImportManager.getGlobPattern(ImageHandler.extensions)
                .should.equal('+(.jpg|.jpeg|.gif|.png|.svg|.svgz|.ico|.webp)');
            ImportManager.getExtensionGlob(ImportManager.getExtensions())
                .should.equal('*+(.jpg|.jpeg|.gif|.png|.svg|.svgz|.ico|.webp|.json|.md|.markdown|.zip)');
            ImportManager.getDirectoryGlob(ImportManager.getDirectories())
                .should.equal('+(images|content)');
            ImportManager.getExtensionGlob(ImportManager.getExtensions(), 0)
                .should.equal('*+(.jpg|.jpeg|.gif|.png|.svg|.svgz|.ico|.webp|.json|.md|.markdown|.zip)');
            ImportManager.getDirectoryGlob(ImportManager.getDirectories(), 0)
                .should.equal('+(images|content)');
            ImportManager.getExtensionGlob(ImportManager.getExtensions(), 1)
                .should.equal('{*/*,*}+(.jpg|.jpeg|.gif|.png|.svg|.svgz|.ico|.webp|.json|.md|.markdown|.zip)');
            ImportManager.getDirectoryGlob(ImportManager.getDirectories(), 1)
                .should.equal('{*/,}+(images|content)');
            ImportManager.getExtensionGlob(ImportManager.getExtensions(), 2)
                .should.equal('**/*+(.jpg|.jpeg|.gif|.png|.svg|.svgz|.ico|.webp|.json|.md|.markdown|.zip)');
            ImportManager.getDirectoryGlob(ImportManager.getDirectories(), 2)
                .should.equal('**/+(images|content)');
        });

        it('cleans up', async function () {
            const file = path.resolve('test/utils/fixtures/import/zips/zip-with-base-dir');
            ImportManager.fileToDelete = file;
            const removeStub = sinon.stub(fs, 'remove').withArgs(file).returns(Promise.resolve());

            await ImportManager.cleanUp();
            removeStub.calledOnce.should.be.true();
            should(ImportManager.fileToDelete).be.null();
        });

        it('doesn\'t clean up', async function () {
            ImportManager.fileToDelete = null;
            const removeStub = sinon.stub(fs, 'remove').returns(Promise.resolve());

            await ImportManager.cleanUp();
            removeStub.called.should.be.false();
        });

        it('silently ignores clean up errors', async function () {
            const file = path.resolve('test/utils/fixtures/import/zips/zip-with-base-dir');
            ImportManager.fileToDelete = file;
            const removeStub = sinon.stub(fs, 'remove').withArgs(file).returns(Promise.reject(new Error('Unknown file')));

            await ImportManager.cleanUp();
            removeStub.calledOnce.should.be.true();
            should(ImportManager.fileToDelete).be.null();
        });

        // Step 1 of importing is loadFile
        describe('loadFile', function () {
            it('knows when to process a file', function (done) {
                const testFile = {name: 'myFile.json', path: '/my/path/myFile.json'};
                const zipSpy = sinon.stub(ImportManager, 'processZip').returns(Promise.resolve({}));
                const fileSpy = sinon.stub(ImportManager, 'processFile').returns(Promise.resolve({}));

                ImportManager.loadFile(testFile).then(function () {
                    zipSpy.calledOnce.should.be.false();
                    fileSpy.calledOnce.should.be.true();
                    done();
                }).catch(done);
            });

            // We need to make sure we don't actually extract a zip and leave temporary files everywhere!
            it('knows when to process a zip', function (done) {
                const testZip = {name: 'myFile.zip', path: '/my/path/myFile.zip'};
                const zipSpy = sinon.stub(ImportManager, 'processZip').returns(Promise.resolve({}));
                const fileSpy = sinon.stub(ImportManager, 'processFile').returns(Promise.resolve({}));

                ImportManager.loadFile(testZip).then(function () {
                    zipSpy.calledOnce.should.be.true();
                    fileSpy.calledOnce.should.be.false();
                    done();
                }).catch(done);
            });

            it('has same result for zips and files', function (done) {
                const testFile = {name: 'myFile.json', path: '/my/path/myFile.json'};
                const testZip = {name: 'myFile.zip', path: '/my/path/myFile.zip'};

                // need to stub out the extract and glob function for zip
                const extractSpy = sinon.stub(ImportManager, 'extractZip').returns(Promise.resolve('/tmp/dir/'));

                const validSpy = sinon.stub(ImportManager, 'isValidZip').returns(true);
                const baseDirSpy = sinon.stub(ImportManager, 'getBaseDirectory').returns('');
                const getFileSpy = sinon.stub(ImportManager, 'getFilesFromZip');
                const jsonSpy = sinon.stub(JSONHandler, 'loadFile').returns(Promise.resolve({posts: []}));
                const imageSpy = sinon.stub(ImageHandler, 'loadFile');
                const mdSpy = sinon.stub(MarkdownHandler, 'loadFile');

                getFileSpy.returns([]);
                getFileSpy.withArgs(JSONHandler, sinon.match.string).returns([{path: '/tmp/dir/myFile.json', name: 'myFile.json'}]);

                ImportManager.processZip(testZip).then(function (zipResult) {
                    extractSpy.calledOnce.should.be.true();
                    validSpy.calledOnce.should.be.true();
                    baseDirSpy.calledOnce.should.be.true();
                    getFileSpy.calledThrice.should.be.true();
                    jsonSpy.calledOnce.should.be.true();
                    imageSpy.called.should.be.false();
                    mdSpy.called.should.be.false();

                    ImportManager.processFile(testFile, '.json').then(function (fileResult) {
                        jsonSpy.calledTwice.should.be.true();

                        // They should both have data keys, and they should be equivalent
                        zipResult.should.have.property('data');
                        fileResult.should.have.property('data');
                        zipResult.should.eql(fileResult);
                        done();
                    });
                }).catch(done);
            });

            describe('Validate Zip', function () {
                it('accepts a zip with a base directory', function () {
                    const testDir = path.resolve('test/utils/fixtures/import/zips/zip-with-base-dir');

                    ImportManager.isValidZip(testDir).should.be.ok();
                });

                it('accepts a zip without a base directory', function () {
                    const testDir = path.resolve('test/utils/fixtures/import/zips/zip-without-base-dir');

                    ImportManager.isValidZip(testDir).should.be.ok();
                });

                it('accepts a zip with an image directory', function () {
                    const testDir = path.resolve('test/utils/fixtures/import/zips/zip-image-dir');

                    ImportManager.isValidZip(testDir).should.be.ok();
                });

                it('accepts a zip with uppercase image extensions', function () {
                    const testDir = path.resolve('test/utils/fixtures/import/zips/zip-uppercase-extensions');

                    ImportManager.isValidZip(testDir).should.be.ok();
                });

                it('fails a zip with two base directories', function () {
                    const testDir = path.resolve('test/utils/fixtures/import/zips/zip-with-double-base-dir');

                    ImportManager.isValidZip.bind(ImportManager, testDir).should.throw(errors.UnsupportedMediaTypeError);
                });

                it('fails a zip with no content', function () {
                    const testDir = path.resolve('test/utils/fixtures/import/zips/zip-invalid');

                    ImportManager.isValidZip.bind(ImportManager, testDir).should.throw(errors.UnsupportedMediaTypeError);
                });
            });

            describe('Process Zip', function () {
                const testZip = {name: 'myFile.zip', path: '/my/path/myFile.zip'};

                this.beforeEach(() => {
                    sinon.stub(JSONHandler, 'loadFile').returns(Promise.resolve({posts: []}));
                    sinon.stub(ImageHandler, 'loadFile');
                    sinon.stub(MarkdownHandler, 'loadFile');
                });

                it('accepts a zip with a base directory', async function () {
                    const testDir = path.resolve('test/utils/fixtures/import/zips/zip-with-base-dir');
                    const extractSpy = sinon.stub(ImportManager, 'extractZip').returns(Promise.resolve(testDir));
    
                    const zipResult = await ImportManager.processZip(testZip);
                    zipResult.data.should.not.be.undefined();
                    should(zipResult.images).be.undefined();
                    extractSpy.calledOnce.should.be.true();
                });

                it('accepts a zip without a base directory', async function () {
                    const testDir = path.resolve('test/utils/fixtures/import/zips/zip-without-base-dir');
                    const extractSpy = sinon.stub(ImportManager, 'extractZip').returns(Promise.resolve(testDir));

                    const zipResult = await ImportManager.processZip(testZip);
                    zipResult.data.should.not.be.undefined();
                    should(zipResult.images).be.undefined();
                    extractSpy.calledOnce.should.be.true();
                });

                it('accepts a zip with an image directory', async function () {
                    const testDir = path.resolve('test/utils/fixtures/import/zips/zip-image-dir');
                    const extractSpy = sinon.stub(ImportManager, 'extractZip').returns(Promise.resolve(testDir));

                    const zipResult = await ImportManager.processZip(testZip);
                    zipResult.images.length.should.eql(1);
                    should(zipResult.data).be.undefined();
                    extractSpy.calledOnce.should.be.true();
                });

                it('accepts a zip with uppercase image extensions', async function () {
                    const testDir = path.resolve('test/utils/fixtures/import/zips/zip-uppercase-extensions');
                    const extractSpy = sinon.stub(ImportManager, 'extractZip').returns(Promise.resolve(testDir));
    
                    const zipResult = await ImportManager.processZip(testZip);
                    zipResult.images.length.should.eql(1);
                    should(zipResult.data).be.undefined();
                    extractSpy.calledOnce.should.be.true();
                });

                it('throws zipContainsMultipleDataFormats', async function () {
                    const testDir = path.resolve('test/utils/fixtures/import/zips/zip-multiple-data-formats');
                    const extractSpy = sinon.stub(ImportManager, 'extractZip').returns(Promise.resolve(testDir));
    
                    await should(ImportManager.processZip(testZip)).rejectedWith(/multiple data formats/);
                    extractSpy.calledOnce.should.be.true();
                });

                it('throws noContentToImport', async function () {
                    const testDir = path.resolve('test/utils/fixtures/import/zips/zip-empty');
                    const extractSpy = sinon.stub(ImportManager, 'extractZip').returns(Promise.resolve(testDir));
    
                    await should(ImportManager.processZip(testZip)).rejectedWith(/not include any content/);
                    extractSpy.calledOnce.should.be.true();
                });
            });

            describe('Get Base Dir', function () {
                it('returns string for base directory', function () {
                    const testDir = path.resolve('test/utils/fixtures/import/zips/zip-with-base-dir');

                    ImportManager.getBaseDirectory(testDir).should.equal('basedir');
                });

                it('returns string for double base directory', function () {
                    const testDir = path.resolve('test/utils/fixtures/import/zips/zip-with-double-base-dir');

                    ImportManager.getBaseDirectory(testDir).should.equal('basedir');
                });

                it('returns empty for no base directory', function () {
                    const testDir = path.resolve('test/utils/fixtures/import/zips/zip-without-base-dir');

                    should.not.exist(ImportManager.getBaseDirectory(testDir));
                });

                it('returns empty for content handler directories', function () {
                    const testDir = path.resolve('test/utils/fixtures/import/zips/zip-image-dir');

                    should.not.exist(ImportManager.getBaseDirectory(testDir));
                });

                it('throws invalidZipFileBaseDirectory', function () {
                    const testDir = path.resolve('test/utils/fixtures/import/zips/zip-empty');

                    should(() => ImportManager.getBaseDirectory(testDir)).throwError(/invalid zip file/i);
                });
            });

            describe('Zip behaviour', function () {
                it('can call extract and error correctly', function () {
                    return ImportManager
                        // Deliberately pass something that can't be extracted just to check this method signature is working
                        .extractZip('test/utils/fixtures/import/zips/zip-with-base-dir')
                        .then((res) => {
                            throw new Error('should have failed');
                        })
                        .catch((err) => {
                            err.message.should.match(/EISDIR/);
                            err.code.should.match(/EISDIR/);
                        });
                });
            });
        });

        // Step 2 of importing is preProcess
        describe('preProcess', function () {
            // preProcess can modify the data prior to importing
            it('calls the DataImporter preProcess method', function (done) {
                const input = {data: {}, images: []};

                // pass a copy so that input doesn't get modified
                const inputCopy = _.cloneDeep(input);

                const dataSpy = sinon.spy(DataImporter, 'preProcess');
                const imageSpy = sinon.spy(ImageImporter, 'preProcess');

                ImportManager.preProcess(inputCopy).then(function (output) {
                    dataSpy.calledOnce.should.be.true();
                    dataSpy.calledWith(inputCopy).should.be.true();
                    imageSpy.calledOnce.should.be.true();
                    imageSpy.calledWith(inputCopy).should.be.true();
                    // eql checks for equality
                    // equal checks the references are for the same object
                    output.should.not.equal(input);
                    output.should.have.property('preProcessedByData', true);
                    output.should.have.property('preProcessedByImage', true);
                    done();
                }).catch(done);
            });
        });

        // Step 3 of importing is doImport
        describe('doImport', function () {
            // doImport calls the real importers and has an effect on the DB. We don't want any of those calls to be made,
            // but to test that the right calls would be made
            it('calls the DataImporter doImport method with the data object', function (done) {
                const input = {data: {posts: []}, images: []};

                // pass a copy so that input doesn't get modified
                const inputCopy = _.cloneDeep(input);

                const dataSpy = sinon.stub(DataImporter, 'doImport').callsFake(function (i) {
                    return Promise.resolve(i);
                });

                const imageSpy = sinon.stub(ImageImporter, 'doImport').callsFake(function (i) {
                    return Promise.resolve(i);
                });

                // The data importer should get the data object
                const expectedData = input.data;

                const expectedImages = input.images;

                ImportManager.doImport(inputCopy).then(function (output) {
                    // eql checks for equality
                    // equal checks the references are for the same object
                    dataSpy.calledOnce.should.be.true();
                    imageSpy.calledOnce.should.be.true();
                    dataSpy.getCall(0).args[0].should.eql(expectedData);
                    imageSpy.getCall(0).args[0].should.eql(expectedImages);

                    // we stubbed this as a noop but ImportManager calls with sequence, so we should get an array
                    output.should.eql([expectedImages, expectedData]);
                    done();
                }).catch(done);
            });
        });

        // Step 4 of importing is generateReport
        describe('generateReport', function () {
            // generateReport is intended to create a message to show to the user about what has been imported
            // it is currently a noop
            it('is currently a noop', function (done) {
                const input = [{data: {}, images: []}];
                ImportManager.generateReport(input).then(function (output) {
                    output.should.equal(input);
                    done();
                }).catch(done);
            });
        });

        describe('importFromFile', function () {
            it('does the import steps in order', function (done) {
                const loadFileSpy = sinon.stub(ImportManager, 'loadFile').returns(Promise.resolve({}));
                const preProcessSpy = sinon.stub(ImportManager, 'preProcess').returns(Promise.resolve({}));
                const doImportSpy = sinon.stub(ImportManager, 'doImport').returns(Promise.resolve([]));
                const generateReportSpy = sinon.spy(ImportManager, 'generateReport');
                const cleanupSpy = sinon.stub(ImportManager, 'cleanUp').returns(Promise.resolve());

                ImportManager.importFromFile({name: 'test.json', path: '/test.json'}).then(function () {
                    loadFileSpy.calledOnce.should.be.true();
                    preProcessSpy.calledOnce.should.be.true();
                    doImportSpy.calledOnce.should.be.true();
                    generateReportSpy.calledOnce.should.be.true();
                    cleanupSpy.calledOnce.should.be.true();
                    sinon.assert.callOrder(loadFileSpy, preProcessSpy, doImportSpy, generateReportSpy, cleanupSpy);

                    done();
                }).catch(done);
            });
        });
    });

    describe('JSONHandler', function () {
        it('has the correct interface', function () {
            JSONHandler.type.should.eql('data');
            JSONHandler.extensions.should.be.instanceof(Array).and.have.lengthOf(1);
            JSONHandler.extensions.should.containEql('.json');
            JSONHandler.contentTypes.should.be.instanceof(Array).and.have.lengthOf(2);
            JSONHandler.contentTypes.should.containEql('application/octet-stream');
            JSONHandler.contentTypes.should.containEql('application/json');
            JSONHandler.loadFile.should.be.instanceof(Function);
        });

        it('correctly handles a valid db api wrapper', function (done) {
            const file = [{
                path: testUtils.fixtures.getExportFixturePath('valid'),
                name: 'valid.json'
            }];
            JSONHandler.loadFile(file).then(function (result) {
                _.keys(result).should.containEql('meta');
                _.keys(result).should.containEql('data');
                done();
            }).catch(done);
        });

        it('correctly errors when given a bad db api wrapper', function (done) {
            const file = [{
                path: testUtils.fixtures.getExportFixturePath('broken'),
                name: 'broken.json'
            }];

            JSONHandler.loadFile(file).then(function () {
                done(new Error('Didn\'t error for bad db api wrapper'));
            }).catch(function (response) {
                response.errorType.should.equal('BadRequestError');
                done();
            }).catch(done);
        });
    });

    describe('ImageHandler', function () {
        const store = storage.getStorage();

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

    describe('MarkdownHandler', function () {
        it('has the correct interface', function () {
            MarkdownHandler.type.should.eql('data');
            MarkdownHandler.extensions.should.be.instanceof(Array).and.have.lengthOf(2);
            MarkdownHandler.extensions.should.containEql('.md');
            MarkdownHandler.extensions.should.containEql('.markdown');
            MarkdownHandler.contentTypes.should.be.instanceof(Array).and.have.lengthOf(2);
            MarkdownHandler.contentTypes.should.containEql('application/octet-stream');
            MarkdownHandler.contentTypes.should.containEql('text/plain');
            MarkdownHandler.loadFile.should.be.instanceof(Function);
        });

        it('does convert a markdown file into a post object', function (done) {
            const filename = 'draft-2014-12-19-test-1.md';

            const file = [{
                path: testUtils.fixtures.getImportFixturePath(filename),
                name: filename
            }];

            MarkdownHandler.loadFile(file).then(function (result) {
                result.data.posts[0].markdown.should.eql('You\'re live! Nice.');
                result.data.posts[0].status.should.eql('draft');
                result.data.posts[0].slug.should.eql('test-1');
                result.data.posts[0].title.should.eql('test-1');
                result.data.posts[0].created_at.should.eql(1418990400000);
                moment.utc(result.data.posts[0].created_at).format('DD MM YY HH:mm').should.eql('19 12 14 12:00');
                result.data.posts[0].should.not.have.property('image');

                done();
            }).catch(done);
        });

        it('can parse a title from a markdown file', function (done) {
            const filename = 'draft-2014-12-19-test-2.md';

            const file = [{
                path: testUtils.fixtures.getImportFixturePath(filename),
                name: filename
            }];

            MarkdownHandler.loadFile(file).then(function (result) {
                result.data.posts[0].markdown.should.eql('You\'re live! Nice.');
                result.data.posts[0].status.should.eql('draft');
                result.data.posts[0].slug.should.eql('test-2');
                result.data.posts[0].title.should.eql('Welcome to Ghost');
                result.data.posts[0].created_at.should.eql(1418990400000);
                result.data.posts[0].should.not.have.property('image');

                done();
            }).catch(done);
        });

        it('can parse a featured image from a markdown file if there is a title', function (done) {
            const filename = 'draft-2014-12-19-test-3.md';

            const file = [{
                path: testUtils.fixtures.getImportFixturePath(filename),
                name: filename
            }];

            MarkdownHandler.loadFile(file).then(function (result) {
                result.data.posts[0].markdown.should.eql('You\'re live! Nice.');
                result.data.posts[0].status.should.eql('draft');
                result.data.posts[0].slug.should.eql('test-3');
                result.data.posts[0].title.should.eql('Welcome to Ghost');
                result.data.posts[0].created_at.should.eql(1418990400000);
                result.data.posts[0].image.should.eql('/images/kitten.jpg');

                done();
            }).catch(done);
        });

        it('can import a published post', function (done) {
            const filename = 'published-2014-12-19-test-1.md';

            const file = [{
                path: testUtils.fixtures.getImportFixturePath(filename),
                name: filename
            }];

            MarkdownHandler.loadFile(file).then(function (result) {
                result.data.posts[0].markdown.should.eql('You\'re live! Nice.');
                result.data.posts[0].status.should.eql('published');
                result.data.posts[0].slug.should.eql('test-1');
                result.data.posts[0].title.should.eql('Welcome to Ghost');
                result.data.posts[0].published_at.should.eql(1418990400000);
                moment.utc(result.data.posts[0].published_at).format('DD MM YY HH:mm').should.eql('19 12 14 12:00');
                result.data.posts[0].should.not.have.property('image');

                done();
            }).catch(done);
        });

        it('does not import deleted posts', function (done) {
            const filename = 'deleted-2014-12-19-test-1.md';

            const file = [{
                path: testUtils.fixtures.getImportFixturePath(filename),
                name: filename
            }];

            MarkdownHandler.loadFile(file).then(function (result) {
                result.data.posts.should.be.empty();

                done();
            }).catch(done);
        });

        it('can import multiple files', function (done) {
            const files = [{
                path: testUtils.fixtures.getImportFixturePath('deleted-2014-12-19-test-1.md'),
                name: 'deleted-2014-12-19-test-1.md'
            }, {
                path: testUtils.fixtures.getImportFixturePath('published-2014-12-19-test-1.md'),
                name: 'published-2014-12-19-test-1.md'
            }, {
                path: testUtils.fixtures.getImportFixturePath('draft-2014-12-19-test-3.md'),
                name: 'draft-2014-12-19-test-3.md'
            }];

            MarkdownHandler.loadFile(files).then(function (result) {
                // deleted-2014-12-19-test-1.md
                // doesn't get imported ;)

                // loadFile doesn't guarantee order of results
                const one = result.data.posts[0].status === 'published' ? 0 : 1;

                const two = one === 0 ? 1 : 0;

                // published-2014-12-19-test-1.md
                result.data.posts[one].markdown.should.eql('You\'re live! Nice.');
                result.data.posts[one].status.should.eql('published');
                result.data.posts[one].slug.should.eql('test-1');
                result.data.posts[one].title.should.eql('Welcome to Ghost');
                result.data.posts[one].published_at.should.eql(1418990400000);
                moment.utc(result.data.posts[one].published_at).format('DD MM YY HH:mm').should.eql('19 12 14 12:00');
                result.data.posts[one].should.not.have.property('image');

                // draft-2014-12-19-test-3.md
                result.data.posts[two].markdown.should.eql('You\'re live! Nice.');
                result.data.posts[two].status.should.eql('draft');
                result.data.posts[two].slug.should.eql('test-3');
                result.data.posts[two].title.should.eql('Welcome to Ghost');
                result.data.posts[two].created_at.should.eql(1418990400000);
                result.data.posts[two].image.should.eql('/images/kitten.jpg');

                done();
            }).catch(done);
        });
    });

    describe('DataImporter', function () {
        it('has the correct interface', function () {
            DataImporter.type.should.eql('data');
            DataImporter.preProcess.should.be.instanceof(Function);
            DataImporter.doImport.should.be.instanceof(Function);
        });

        it('does preprocess posts, users and tags correctly', function () {
            const inputData = require('../../../../utils/fixtures/import/import-data-1.json');
            const outputData = DataImporter.preProcess(_.cloneDeep(inputData));

            // Data preprocess is a noop
            inputData.data.data.posts[0].should.eql(outputData.data.data.posts[0]);
            inputData.data.data.tags[0].should.eql(outputData.data.data.tags[0]);
            inputData.data.data.users[0].should.eql(outputData.data.data.users[0]);
        });
    });

    describe('ImageImporter', function () {
        it('has the correct interface', function () {
            ImageImporter.type.should.eql('images');
            ImageImporter.preProcess.should.be.instanceof(Function);
            ImageImporter.doImport.should.be.instanceof(Function);
        });

        it('does preprocess posts, users and tags correctly', function () {
            let inputData = require('../../../../utils/fixtures/import/import-data-1.json');
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
            const inputData = require('../../../../utils/fixtures/import/import-data-1.json');

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
});
