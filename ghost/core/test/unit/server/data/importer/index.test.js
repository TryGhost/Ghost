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
const RevueHandler = require('../../../../../core/server/data/importer/handlers/revue');
const DataImporter = require('../../../../../core/server/data/importer/importers/data');
const RevueImporter = require('../../../../../core/server/data/importer/importers/importer-revue');
const configUtils = require('../../../../utils/configUtils');
const logging = require('@tryghost/logging');

describe('Importer', function () {
    afterEach(async function () {
        sinon.restore();
        ImageHandler = rewire('../../../../../core/server/data/importer/handlers/image');
        await configUtils.restore();
    });

    describe('ImportManager', function () {
        it('has the correct interface', function () {
            ImportManager.handlers.should.be.instanceof(Array).and.have.lengthOf(6);
            ImportManager.importers.should.be.instanceof(Array).and.have.lengthOf(5);
            ImportManager.loadFile.should.be.instanceof(Function);
            ImportManager.preProcess.should.be.instanceof(Function);
            ImportManager.doImport.should.be.instanceof(Function);
            ImportManager.generateReport.should.be.instanceof(Function);
        });

        it('gets the correct extensions', function () {
            ImportManager.getExtensions().should.be.instanceof(Array).and.have.lengthOf(32);
            ImportManager.getExtensions().should.containEql('.csv');
            ImportManager.getExtensions().should.containEql('.json');
            ImportManager.getExtensions().should.containEql('.zip');
            ImportManager.getExtensions().should.containEql('.jpg');
            ImportManager.getExtensions().should.containEql('.md');
            ImportManager.getExtensions().should.containEql('.webp');
            ImportManager.getExtensions().should.containEql('.mp4');
            ImportManager.getExtensions().should.containEql('.ogv');
            ImportManager.getExtensions().should.containEql('.mp3');
            ImportManager.getExtensions().should.containEql('.wav');
            ImportManager.getExtensions().should.containEql('.ogg');
            ImportManager.getExtensions().should.containEql('.m4a');

            ImportManager.getExtensions().should.containEql('.pdf');
            ImportManager.getExtensions().should.containEql('.json');
            ImportManager.getExtensions().should.containEql('.jsonld');
            ImportManager.getExtensions().should.containEql('.odp');
            ImportManager.getExtensions().should.containEql('.ods');
            ImportManager.getExtensions().should.containEql('.odt');
            ImportManager.getExtensions().should.containEql('.ppt');
            ImportManager.getExtensions().should.containEql('.pptx');
            ImportManager.getExtensions().should.containEql('.rtf');
            ImportManager.getExtensions().should.containEql('.txt');
            ImportManager.getExtensions().should.containEql('.xls');
            ImportManager.getExtensions().should.containEql('.xlsx');
            ImportManager.getExtensions().should.containEql('.xml');
        });

        it('gets the correct types', function () {
            ImportManager.getContentTypes().should.be.instanceof(Array).and.have.lengthOf(35);
            ImportManager.getContentTypes().should.containEql('image/jpeg');
            ImportManager.getContentTypes().should.containEql('image/png');
            ImportManager.getContentTypes().should.containEql('image/gif');
            ImportManager.getContentTypes().should.containEql('image/svg+xml');
            ImportManager.getContentTypes().should.containEql('image/x-icon');
            ImportManager.getContentTypes().should.containEql('image/vnd.microsoft.icon');
            ImportManager.getContentTypes().should.containEql('image/webp');

            ImportManager.getContentTypes().should.containEql('video/mp4');
            ImportManager.getContentTypes().should.containEql('video/webm');
            ImportManager.getContentTypes().should.containEql('video/ogg');
            ImportManager.getContentTypes().should.containEql('audio/mp4');
            ImportManager.getContentTypes().should.containEql('audio/mpeg');
            ImportManager.getContentTypes().should.containEql('audio/vnd.wav');
            ImportManager.getContentTypes().should.containEql('audio/wave');
            ImportManager.getContentTypes().should.containEql('audio/wav');
            ImportManager.getContentTypes().should.containEql('audio/x-wav');
            ImportManager.getContentTypes().should.containEql('audio/ogg');
            ImportManager.getContentTypes().should.containEql('audio/x-m4a');

            ImportManager.getContentTypes().should.containEql('application/pdf');
            ImportManager.getContentTypes().should.containEql('application/json');
            ImportManager.getContentTypes().should.containEql('application/ld+json');
            ImportManager.getContentTypes().should.containEql('application/vnd.oasis.opendocument.presentation');
            ImportManager.getContentTypes().should.containEql('application/vnd.oasis.opendocument.spreadsheet');
            ImportManager.getContentTypes().should.containEql('application/vnd.oasis.opendocument.text');
            ImportManager.getContentTypes().should.containEql('application/vnd.ms-powerpoint');
            ImportManager.getContentTypes().should.containEql('application/vnd.openxmlformats-officedocument.presentationml.presentation');
            ImportManager.getContentTypes().should.containEql('application/rtf');
            ImportManager.getContentTypes().should.containEql('text/plain');
            ImportManager.getContentTypes().should.containEql('application/vnd.ms-excel');
            ImportManager.getContentTypes().should.containEql('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            ImportManager.getContentTypes().should.containEql('application/xml');
            ImportManager.getContentTypes().should.containEql('application/atom+xml');

            ImportManager.getContentTypes().should.containEql('application/octet-stream');
            ImportManager.getContentTypes().should.containEql('application/json');

            ImportManager.getContentTypes().should.containEql('text/plain');

            ImportManager.getContentTypes().should.containEql('application/zip');
            ImportManager.getContentTypes().should.containEql('application/x-zip-compressed');
        });

        it('gets the correct directories', function () {
            ImportManager.getDirectories().should.be.instanceof(Array).and.have.lengthOf(4);
            ImportManager.getDirectories().should.containEql('images');
            ImportManager.getDirectories().should.containEql('content');
            ImportManager.getDirectories().should.containEql('media');
            ImportManager.getDirectories().should.containEql('files');
        });

        it('globs extensions correctly', function () {
            ImportManager.getGlobPattern(ImportManager.getExtensions())
                .should.equal('+(.jpg|.jpeg|.gif|.png|.svg|.svgz|.ico|.webp|.mp4|.webm|.ogv|.mp3|.wav|.ogg|.m4a|.pdf|.json|.jsonld|.odp|.ods|.odt|.ppt|.pptx|.rtf|.txt|.xls|.xlsx|.xml|.csv|.md|.markdown|.zip)');
            ImportManager.getGlobPattern(ImportManager.getDirectories())
                .should.equal('+(images|content|media|files)');
            ImportManager.getGlobPattern(JSONHandler.extensions)
                .should.equal('+(.json)');
            ImportManager.getGlobPattern(ImageHandler.extensions)
                .should.equal('+(.jpg|.jpeg|.gif|.png|.svg|.svgz|.ico|.webp)');
            ImportManager.getExtensionGlob(ImportManager.getExtensions())
                .should.equal('*+(.jpg|.jpeg|.gif|.png|.svg|.svgz|.ico|.webp|.mp4|.webm|.ogv|.mp3|.wav|.ogg|.m4a|.pdf|.json|.jsonld|.odp|.ods|.odt|.ppt|.pptx|.rtf|.txt|.xls|.xlsx|.xml|.csv|.md|.markdown|.zip)');
            ImportManager.getDirectoryGlob(ImportManager.getDirectories())
                .should.equal('+(images|content|media|files)');
            ImportManager.getExtensionGlob(ImportManager.getExtensions(), 0)
                .should.equal('*+(.jpg|.jpeg|.gif|.png|.svg|.svgz|.ico|.webp|.mp4|.webm|.ogv|.mp3|.wav|.ogg|.m4a|.pdf|.json|.jsonld|.odp|.ods|.odt|.ppt|.pptx|.rtf|.txt|.xls|.xlsx|.xml|.csv|.md|.markdown|.zip)');
            ImportManager.getDirectoryGlob(ImportManager.getDirectories(), 0)
                .should.equal('+(images|content|media|files)');
            ImportManager.getExtensionGlob(ImportManager.getExtensions(), 1)
                .should.equal('{*/*,*}+(.jpg|.jpeg|.gif|.png|.svg|.svgz|.ico|.webp|.mp4|.webm|.ogv|.mp3|.wav|.ogg|.m4a|.pdf|.json|.jsonld|.odp|.ods|.odt|.ppt|.pptx|.rtf|.txt|.xls|.xlsx|.xml|.csv|.md|.markdown|.zip)');
            ImportManager.getDirectoryGlob(ImportManager.getDirectories(), 1)
                .should.equal('{*/,}+(images|content|media|files)');
            ImportManager.getExtensionGlob(ImportManager.getExtensions(), 2)
                .should.equal('**/*+(.jpg|.jpeg|.gif|.png|.svg|.svgz|.ico|.webp|.mp4|.webm|.ogv|.mp3|.wav|.ogg|.m4a|.pdf|.json|.jsonld|.odp|.ods|.odt|.ppt|.pptx|.rtf|.txt|.xls|.xlsx|.xml|.csv|.md|.markdown|.zip)');
            ImportManager.getDirectoryGlob(ImportManager.getDirectories(), 2)
                .should.equal('**/+(images|content|media|files)');
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
            const loggingStub = sinon.stub(logging, 'error');
            const file = path.resolve('test/utils/fixtures/import/zips/zip-with-base-dir');
            ImportManager.fileToDelete = file;
            const removeStub = sinon.stub(fs, 'remove').withArgs(file).returns(Promise.reject(new Error('Unknown file')));

            await ImportManager.cleanUp();
            removeStub.calledOnce.should.be.true();
            loggingStub.calledOnce.should.be.true();
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
                const zipSpy = sinon.stub(ImportManager, 'processZip').resolves({});
                const fileSpy = sinon.stub(ImportManager, 'processFile').resolves({});

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
                const extractSpy = sinon.stub(ImportManager, 'extractZip').resolves('/tmp/dir/');

                const validSpy = sinon.stub(ImportManager, 'isValidZip').returns(true);
                const baseDirSpy = sinon.stub(ImportManager, 'getBaseDirectory').returns('');
                const getFileSpy = sinon.stub(ImportManager, 'getFilesFromZip');
                const revueSpy = sinon.stub(RevueHandler, 'loadFile').resolves();
                const jsonSpy = sinon.stub(JSONHandler, 'loadFile').resolves({posts: []});
                const imageSpy = sinon.stub(ImageHandler, 'loadFile');
                const mdSpy = sinon.stub(MarkdownHandler, 'loadFile');

                getFileSpy.returns([]);
                getFileSpy.withArgs(JSONHandler, sinon.match.string).returns([{path: '/tmp/dir/myFile.json', name: 'myFile.json'}]);
                getFileSpy.withArgs(RevueHandler, sinon.match.string).returns([{path: '/tmp/dir/myFile.json', name: 'myFile.json'}]);

                ImportManager.processZip(testZip).then(function (zipResult) {
                    extractSpy.calledOnce.should.be.true();
                    validSpy.calledOnce.should.be.true();
                    baseDirSpy.calledOnce.should.be.true();
                    getFileSpy.callCount.should.eql(6);
                    jsonSpy.calledOnce.should.be.true();
                    imageSpy.called.should.be.false();
                    mdSpy.called.should.be.false();
                    revueSpy.called.should.be.true();

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

                it('accepts a zip with a content directory', function () {
                    const testDir = path.resolve('test/utils/fixtures/import/zips/zip-content-dir');

                    ImportManager.isValidZip(testDir).should.be.ok();
                });

                it('accepts a zip with a content/images directory', function () {
                    const testDir = path.resolve('test/utils/fixtures/import/zips/zip-content-images-subdir');

                    ImportManager.isValidZip(testDir).should.be.ok();
                });

                it('accepts a zip with a media directory', function () {
                    const testDir = path.resolve('test/utils/fixtures/import/zips/zip-media-dir');

                    ImportManager.isValidZip(testDir).should.be.ok();
                });

                it('accepts a zip with a files directory', function () {
                    const testDir = path.resolve('test/utils/fixtures/import/zips/zip-files-dir');

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
                    sinon.stub(RevueHandler, 'loadFile');
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

            describe('Zip behavior', function () {
                it('can call extract and error correctly', function () {
                    return ImportManager
                        // Deliberately pass something that can't be extracted just to check this method signature is working
                        .extractZip('test/utils/fixtures/import/zips/zip-with-base-dir')
                        .then(() => {
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
                const input = {
                    data: {},
                    images: [],
                    media: [],
                    files: []
                };

                // pass a copy so that input doesn't get modified
                const inputCopy = _.cloneDeep(input);

                const dataSpy = sinon.spy(DataImporter, 'preProcess');
                const imageSpy = sinon.spy(ImportManager.importers[0], 'preProcess');
                const revueSpy = sinon.spy(RevueImporter, 'preProcess');

                ImportManager.preProcess(inputCopy).then(function (output) {
                    revueSpy.calledOnce.should.be.true();
                    revueSpy.calledWith(inputCopy).should.be.true();
                    dataSpy.calledOnce.should.be.true();
                    dataSpy.calledWith(inputCopy).should.be.true();
                    imageSpy.calledOnce.should.be.true();
                    imageSpy.calledWith(inputCopy).should.be.true();
                    // eql checks for equality
                    // equal checks the references are for the same object
                    output.should.not.equal(input);
                    output.should.have.property('preProcessedByData', true);
                    output.should.have.property('preProcessedByImage', true);
                    output.should.have.property('preProcessedByMedia', true);
                    output.should.have.property('preProcessedByFiles', true);
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

                const imageSpy = sinon.stub(ImportManager.importers[0], 'doImport').callsFake(function (i) {
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
                    output.should.eql({images: expectedImages, data: expectedData});
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
});
