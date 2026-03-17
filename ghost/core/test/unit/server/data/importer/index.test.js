const assert = require('node:assert/strict');
const {assertExists} = require('../../../../utils/assertions');
const errors = require('@tryghost/errors');
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
const configUtils = require('../../../../utils/config-utils');
const logging = require('@tryghost/logging');

describe('Importer', function () {
    afterEach(async function () {
        sinon.restore();
        ImageHandler = rewire('../../../../../core/server/data/importer/handlers/image');
        await configUtils.restore();
    });

    describe('ImportManager', function () {
        it('has the correct interface', function () {
            assert(Array.isArray(ImportManager.handlers));
            assert.equal(ImportManager.handlers.length, 6);
            assert(Array.isArray(ImportManager.importers));
            assert.equal(ImportManager.importers.length, 5);
            assert.equal(typeof ImportManager.loadFile, 'function');
            assert.equal(typeof ImportManager.preProcess, 'function');
            assert.equal(typeof ImportManager.doImport, 'function');
            assert.equal(typeof ImportManager.generateReport, 'function');
        });

        it('gets the correct extensions', function () {
            assert(Array.isArray(ImportManager.getExtensions()));
            assert.equal(ImportManager.getExtensions().length, 32);
            assert(ImportManager.getExtensions().includes('.csv'));
            assert(ImportManager.getExtensions().includes('.json'));
            assert(ImportManager.getExtensions().includes('.zip'));
            assert(ImportManager.getExtensions().includes('.jpg'));
            assert(ImportManager.getExtensions().includes('.md'));
            assert(ImportManager.getExtensions().includes('.webp'));
            assert(ImportManager.getExtensions().includes('.mp4'));
            assert(ImportManager.getExtensions().includes('.ogv'));
            assert(ImportManager.getExtensions().includes('.mp3'));
            assert(ImportManager.getExtensions().includes('.wav'));
            assert(ImportManager.getExtensions().includes('.ogg'));
            assert(ImportManager.getExtensions().includes('.m4a'));

            assert(ImportManager.getExtensions().includes('.pdf'));
            assert(ImportManager.getExtensions().includes('.json'));
            assert(ImportManager.getExtensions().includes('.jsonld'));
            assert(ImportManager.getExtensions().includes('.odp'));
            assert(ImportManager.getExtensions().includes('.ods'));
            assert(ImportManager.getExtensions().includes('.odt'));
            assert(ImportManager.getExtensions().includes('.ppt'));
            assert(ImportManager.getExtensions().includes('.pptx'));
            assert(ImportManager.getExtensions().includes('.rtf'));
            assert(ImportManager.getExtensions().includes('.txt'));
            assert(ImportManager.getExtensions().includes('.xls'));
            assert(ImportManager.getExtensions().includes('.xlsx'));
            assert(ImportManager.getExtensions().includes('.xml'));
        });

        it('gets the correct types', function () {
            assert(Array.isArray(ImportManager.getContentTypes()));
            assert.equal(ImportManager.getContentTypes().length, 35);
            assert(ImportManager.getContentTypes().includes('image/jpeg'));
            assert(ImportManager.getContentTypes().includes('image/png'));
            assert(ImportManager.getContentTypes().includes('image/gif'));
            assert(ImportManager.getContentTypes().includes('image/svg+xml'));
            assert(ImportManager.getContentTypes().includes('image/x-icon'));
            assert(ImportManager.getContentTypes().includes('image/vnd.microsoft.icon'));
            assert(ImportManager.getContentTypes().includes('image/webp'));

            assert(ImportManager.getContentTypes().includes('video/mp4'));
            assert(ImportManager.getContentTypes().includes('video/webm'));
            assert(ImportManager.getContentTypes().includes('video/ogg'));
            assert(ImportManager.getContentTypes().includes('audio/mp4'));
            assert(ImportManager.getContentTypes().includes('audio/mpeg'));
            assert(ImportManager.getContentTypes().includes('audio/vnd.wav'));
            assert(ImportManager.getContentTypes().includes('audio/wave'));
            assert(ImportManager.getContentTypes().includes('audio/wav'));
            assert(ImportManager.getContentTypes().includes('audio/x-wav'));
            assert(ImportManager.getContentTypes().includes('audio/ogg'));
            assert(ImportManager.getContentTypes().includes('audio/x-m4a'));

            assert(ImportManager.getContentTypes().includes('application/pdf'));
            assert(ImportManager.getContentTypes().includes('application/json'));
            assert(ImportManager.getContentTypes().includes('application/ld+json'));
            assert(ImportManager.getContentTypes().includes('application/vnd.oasis.opendocument.presentation'));
            assert(ImportManager.getContentTypes().includes('application/vnd.oasis.opendocument.spreadsheet'));
            assert(ImportManager.getContentTypes().includes('application/vnd.oasis.opendocument.text'));
            assert(ImportManager.getContentTypes().includes('application/vnd.ms-powerpoint'));
            assert(ImportManager.getContentTypes().includes('application/vnd.openxmlformats-officedocument.presentationml.presentation'));
            assert(ImportManager.getContentTypes().includes('application/rtf'));
            assert(ImportManager.getContentTypes().includes('text/plain'));
            assert(ImportManager.getContentTypes().includes('application/vnd.ms-excel'));
            assert(ImportManager.getContentTypes().includes('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'));
            assert(ImportManager.getContentTypes().includes('application/xml'));
            assert(ImportManager.getContentTypes().includes('application/atom+xml'));

            assert(ImportManager.getContentTypes().includes('application/octet-stream'));
            assert(ImportManager.getContentTypes().includes('application/json'));

            assert(ImportManager.getContentTypes().includes('text/plain'));

            assert(ImportManager.getContentTypes().includes('application/zip'));
            assert(ImportManager.getContentTypes().includes('application/x-zip-compressed'));
        });

        it('gets the correct directories', function () {
            assert(Array.isArray(ImportManager.getDirectories()));
            assert.equal(ImportManager.getDirectories().length, 4);
            assert(ImportManager.getDirectories().includes('images'));
            assert(ImportManager.getDirectories().includes('content'));
            assert(ImportManager.getDirectories().includes('media'));
            assert(ImportManager.getDirectories().includes('files'));
        });

        it('globs extensions correctly', function () {
            assert.equal(ImportManager.getGlobPattern(ImportManager.getExtensions()), '+(.jpg|.jpeg|.gif|.png|.svg|.svgz|.ico|.webp|.mp4|.webm|.ogv|.mp3|.wav|.ogg|.m4a|.pdf|.json|.jsonld|.odp|.ods|.odt|.ppt|.pptx|.rtf|.txt|.xls|.xlsx|.xml|.csv|.md|.markdown|.zip)');
            assert.equal(ImportManager.getGlobPattern(ImportManager.getDirectories()), '+(images|content|media|files)');
            assert.equal(ImportManager.getGlobPattern(JSONHandler.extensions), '+(.json)');
            assert.equal(ImportManager.getGlobPattern(ImageHandler.extensions), '+(.jpg|.jpeg|.gif|.png|.svg|.svgz|.ico|.webp)');
            assert.equal(ImportManager.getExtensionGlob(ImportManager.getExtensions()), '*+(.jpg|.jpeg|.gif|.png|.svg|.svgz|.ico|.webp|.mp4|.webm|.ogv|.mp3|.wav|.ogg|.m4a|.pdf|.json|.jsonld|.odp|.ods|.odt|.ppt|.pptx|.rtf|.txt|.xls|.xlsx|.xml|.csv|.md|.markdown|.zip)');
            assert.equal(ImportManager.getDirectoryGlob(ImportManager.getDirectories()), '+(images|content|media|files)');
            assert.equal(ImportManager.getExtensionGlob(ImportManager.getExtensions(), 0), '*+(.jpg|.jpeg|.gif|.png|.svg|.svgz|.ico|.webp|.mp4|.webm|.ogv|.mp3|.wav|.ogg|.m4a|.pdf|.json|.jsonld|.odp|.ods|.odt|.ppt|.pptx|.rtf|.txt|.xls|.xlsx|.xml|.csv|.md|.markdown|.zip)');
            assert.equal(ImportManager.getDirectoryGlob(ImportManager.getDirectories(), 0), '+(images|content|media|files)');
            assert.equal(ImportManager.getExtensionGlob(ImportManager.getExtensions(), 1), '{*/*,*}+(.jpg|.jpeg|.gif|.png|.svg|.svgz|.ico|.webp|.mp4|.webm|.ogv|.mp3|.wav|.ogg|.m4a|.pdf|.json|.jsonld|.odp|.ods|.odt|.ppt|.pptx|.rtf|.txt|.xls|.xlsx|.xml|.csv|.md|.markdown|.zip)');
            assert.equal(ImportManager.getDirectoryGlob(ImportManager.getDirectories(), 1), '{*/,}+(images|content|media|files)');
            assert.equal(ImportManager.getExtensionGlob(ImportManager.getExtensions(), 2), '**/*+(.jpg|.jpeg|.gif|.png|.svg|.svgz|.ico|.webp|.mp4|.webm|.ogv|.mp3|.wav|.ogg|.m4a|.pdf|.json|.jsonld|.odp|.ods|.odt|.ppt|.pptx|.rtf|.txt|.xls|.xlsx|.xml|.csv|.md|.markdown|.zip)');
            assert.equal(ImportManager.getDirectoryGlob(ImportManager.getDirectories(), 2), '**/+(images|content|media|files)');
        });

        it('cleans up', async function () {
            const file = path.resolve('test/utils/fixtures/import/zips/zip-with-base-dir');
            ImportManager.fileToDelete = file;
            const removeStub = sinon.stub(fs, 'remove').withArgs(file).returns(Promise.resolve());

            await ImportManager.cleanUp();
            sinon.assert.calledOnce(removeStub);
            assert.equal(ImportManager.fileToDelete, null);
        });

        it('doesn\'t clean up', async function () {
            ImportManager.fileToDelete = null;
            const removeStub = sinon.stub(fs, 'remove').returns(Promise.resolve());

            await ImportManager.cleanUp();
            sinon.assert.notCalled(removeStub);
        });

        it('silently ignores clean up errors', async function () {
            const loggingStub = sinon.stub(logging, 'error');
            const file = path.resolve('test/utils/fixtures/import/zips/zip-with-base-dir');
            ImportManager.fileToDelete = file;
            const removeStub = sinon.stub(fs, 'remove').withArgs(file).returns(Promise.reject(new Error('Unknown file')));

            await ImportManager.cleanUp();
            sinon.assert.calledOnce(removeStub);
            sinon.assert.calledOnce(loggingStub);
            assert.equal(ImportManager.fileToDelete, null);
        });

        // Step 1 of importing is loadFile
        describe('loadFile', function () {
            it('knows when to process a file', function (done) {
                const testFile = {name: 'myFile.json', path: '/my/path/myFile.json'};
                const zipSpy = sinon.stub(ImportManager, 'processZip').returns(Promise.resolve({}));
                const fileSpy = sinon.stub(ImportManager, 'processFile').returns(Promise.resolve({}));

                ImportManager.loadFile(testFile).then(function () {
                    sinon.assert.notCalled(zipSpy);
                    sinon.assert.calledOnce(fileSpy);
                    done();
                }).catch(done);
            });

            // We need to make sure we don't actually extract a zip and leave temporary files everywhere!
            it('knows when to process a zip', function (done) {
                const testZip = {name: 'myFile.zip', path: '/my/path/myFile.zip'};
                const zipSpy = sinon.stub(ImportManager, 'processZip').resolves({});
                const fileSpy = sinon.stub(ImportManager, 'processFile').resolves({});

                ImportManager.loadFile(testZip).then(function () {
                    sinon.assert.calledOnce(zipSpy);
                    sinon.assert.notCalled(fileSpy);
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
                    sinon.assert.calledOnce(extractSpy);
                    sinon.assert.calledOnce(validSpy);
                    sinon.assert.calledOnce(baseDirSpy);
                    sinon.assert.callCount(getFileSpy, 6);
                    sinon.assert.calledOnce(jsonSpy);
                    sinon.assert.notCalled(imageSpy);
                    sinon.assert.notCalled(mdSpy);
                    sinon.assert.called(revueSpy);

                    ImportManager.processFile(testFile, '.json').then(function (fileResult) {
                        sinon.assert.calledTwice(jsonSpy);

                        // They should both have data keys, and they should be equivalent
                        assert('data' in zipResult);
                        assert('data' in fileResult);
                        assert.deepEqual(zipResult, fileResult);
                        done();
                    });
                }).catch(done);
            });

            describe('Validate Zip', function () {
                it('accepts a zip with a base directory', function () {
                    const testDir = path.resolve('test/utils/fixtures/import/zips/zip-with-base-dir');

                    assert(ImportManager.isValidZip(testDir));
                });

                it('accepts a zip without a base directory', function () {
                    const testDir = path.resolve('test/utils/fixtures/import/zips/zip-without-base-dir');

                    assert(ImportManager.isValidZip(testDir));
                });

                it('accepts a zip with an image directory', function () {
                    const testDir = path.resolve('test/utils/fixtures/import/zips/zip-image-dir');

                    assert(ImportManager.isValidZip(testDir));
                });

                it('accepts a zip with a content directory', function () {
                    const testDir = path.resolve('test/utils/fixtures/import/zips/zip-content-dir');

                    assert(ImportManager.isValidZip(testDir));
                });

                it('accepts a zip with a content/images directory', function () {
                    const testDir = path.resolve('test/utils/fixtures/import/zips/zip-content-images-subdir');

                    assert(ImportManager.isValidZip(testDir));
                });

                it('accepts a zip with a media directory', function () {
                    const testDir = path.resolve('test/utils/fixtures/import/zips/zip-media-dir');

                    assert(ImportManager.isValidZip(testDir));
                });

                it('accepts a zip with a files directory', function () {
                    const testDir = path.resolve('test/utils/fixtures/import/zips/zip-files-dir');

                    assert(ImportManager.isValidZip(testDir));
                });

                it('accepts a zip with uppercase image extensions', function () {
                    const testDir = path.resolve('test/utils/fixtures/import/zips/zip-uppercase-extensions');

                    assert(ImportManager.isValidZip(testDir));
                });

                it('fails a zip with two base directories', function () {
                    const testDir = path.resolve('test/utils/fixtures/import/zips/zip-with-double-base-dir');

                    assert.throws(ImportManager.isValidZip.bind(ImportManager, testDir), errors.UnsupportedMediaTypeError);
                });

                it('fails a zip with no content', function () {
                    const testDir = path.resolve('test/utils/fixtures/import/zips/zip-invalid');

                    assert.throws(ImportManager.isValidZip.bind(ImportManager, testDir), errors.UnsupportedMediaTypeError);
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
                    assertExists(zipResult.data);
                    assert.equal(zipResult.images, undefined);
                    sinon.assert.calledOnce(extractSpy);
                });

                it('accepts a zip without a base directory', async function () {
                    const testDir = path.resolve('test/utils/fixtures/import/zips/zip-without-base-dir');
                    const extractSpy = sinon.stub(ImportManager, 'extractZip').returns(Promise.resolve(testDir));

                    const zipResult = await ImportManager.processZip(testZip);
                    assertExists(zipResult.data);
                    assert.equal(zipResult.images, undefined);
                    sinon.assert.calledOnce(extractSpy);
                });

                it('accepts a zip with an image directory', async function () {
                    const testDir = path.resolve('test/utils/fixtures/import/zips/zip-image-dir');
                    const extractSpy = sinon.stub(ImportManager, 'extractZip').returns(Promise.resolve(testDir));

                    const zipResult = await ImportManager.processZip(testZip);
                    assert.equal(zipResult.images.length, 1);
                    assert.equal(zipResult.data, undefined);
                    sinon.assert.calledOnce(extractSpy);
                });

                it('accepts a zip with uppercase image extensions', async function () {
                    const testDir = path.resolve('test/utils/fixtures/import/zips/zip-uppercase-extensions');
                    const extractSpy = sinon.stub(ImportManager, 'extractZip').returns(Promise.resolve(testDir));

                    const zipResult = await ImportManager.processZip(testZip);
                    assert.equal(zipResult.images.length, 1);
                    assert.equal(zipResult.data, undefined);
                    sinon.assert.calledOnce(extractSpy);
                });

                it('throws zipContainsMultipleDataFormats', async function () {
                    const testDir = path.resolve('test/utils/fixtures/import/zips/zip-multiple-data-formats');
                    const extractSpy = sinon.stub(ImportManager, 'extractZip').returns(Promise.resolve(testDir));

                    await assert.rejects(ImportManager.processZip(testZip), /multiple data formats/);
                    sinon.assert.calledOnce(extractSpy);
                });

                it('throws noContentToImport', async function () {
                    const testDir = path.resolve('test/utils/fixtures/import/zips/zip-empty');
                    const extractSpy = sinon.stub(ImportManager, 'extractZip').returns(Promise.resolve(testDir));

                    await assert.rejects(ImportManager.processZip(testZip), /not include any content/);
                    sinon.assert.calledOnce(extractSpy);
                });
            });

            describe('Get Base Dir', function () {
                it('returns string for base directory', function () {
                    const testDir = path.resolve('test/utils/fixtures/import/zips/zip-with-base-dir');

                    assert.equal(ImportManager.getBaseDirectory(testDir), 'basedir');
                });

                it('returns string for double base directory', function () {
                    const testDir = path.resolve('test/utils/fixtures/import/zips/zip-with-double-base-dir');

                    assert.equal(ImportManager.getBaseDirectory(testDir), 'basedir');
                });

                it('returns empty for no base directory', function () {
                    const testDir = path.resolve('test/utils/fixtures/import/zips/zip-without-base-dir');

                    assert.equal(ImportManager.getBaseDirectory(testDir), undefined);
                });

                it('returns empty for content handler directories', function () {
                    const testDir = path.resolve('test/utils/fixtures/import/zips/zip-image-dir');

                    assert.equal(ImportManager.getBaseDirectory(testDir), undefined);
                });

                it('throws invalidZipFileBaseDirectory', function () {
                    const testDir = path.resolve('test/utils/fixtures/import/zips/zip-empty');

                    assert.throws(() => ImportManager.getBaseDirectory(testDir), /invalid zip file/i);
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
                            assert.match(err.message, /EISDIR/);
                            assert.match(err.code, /EISDIR/);
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
                    sinon.assert.calledOnce(revueSpy);
                    sinon.assert.calledWith(revueSpy, inputCopy);
                    sinon.assert.calledOnce(dataSpy);
                    sinon.assert.calledWith(dataSpy, inputCopy);
                    sinon.assert.calledOnce(imageSpy);
                    sinon.assert.calledWith(imageSpy, inputCopy);
                    // eql checks for equality
                    // equal checks the references are for the same object
                    assert.notEqual(output, input);
                    assert.equal(output.preProcessedByData, true);
                    assert.equal(output.preProcessedByImage, true);
                    assert.equal(output.preProcessedByMedia, true);
                    assert.equal(output.preProcessedByFiles, true);
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
                    sinon.assert.calledOnce(dataSpy);
                    sinon.assert.calledOnce(imageSpy);
                    assert.deepEqual(dataSpy.getCall(0).args[0], expectedData);
                    assert.deepEqual(imageSpy.getCall(0).args[0], expectedImages);

                    // we stubbed this as a noop but ImportManager calls with sequence, so we should get an array
                    assert.deepEqual(output, {images: expectedImages, data: expectedData});
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
                    assert.equal(output, input);
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
                    sinon.assert.calledOnce(loadFileSpy);
                    sinon.assert.calledOnce(preProcessSpy);
                    sinon.assert.calledOnce(doImportSpy);
                    sinon.assert.calledOnce(generateReportSpy);
                    sinon.assert.calledOnce(cleanupSpy);
                    sinon.assert.callOrder(loadFileSpy, preProcessSpy, doImportSpy, generateReportSpy, cleanupSpy);

                    done();
                }).catch(done);
            });
        });
    });

    describe('JSONHandler', function () {
        it('has the correct interface', function () {
            assert.equal(JSONHandler.type, 'data');
            assert.deepEqual(JSONHandler.extensions, ['.json']);
            assert(Array.isArray(JSONHandler.contentTypes));
            assert.equal(JSONHandler.contentTypes.length, 2);
            assert(JSONHandler.contentTypes.includes('application/octet-stream'));
            assert(JSONHandler.contentTypes.includes('application/json'));
            assert.equal(typeof JSONHandler.loadFile, 'function');
        });

        it('correctly handles a valid db api wrapper', function (done) {
            const file = [{
                path: testUtils.fixtures.getExportFixturePath('valid'),
                name: 'valid.json'
            }];
            JSONHandler.loadFile(file).then(function (result) {
                assert(_.keys(result).includes('meta'));
                assert(_.keys(result).includes('data'));
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
                assert.equal(response.errorType, 'BadRequestError');
                done();
            }).catch(done);
        });
    });

    describe('MarkdownHandler', function () {
        it('has the correct interface', function () {
            assert.equal(MarkdownHandler.type, 'data');
            assert(Array.isArray(MarkdownHandler.extensions));
            assert.equal(MarkdownHandler.extensions.length, 2);
            assert(MarkdownHandler.extensions.includes('.md'));
            assert(MarkdownHandler.extensions.includes('.markdown'));
            assert(Array.isArray(MarkdownHandler.contentTypes));
            assert.equal(MarkdownHandler.contentTypes.length, 2);
            assert(MarkdownHandler.contentTypes.includes('application/octet-stream'));
            assert(MarkdownHandler.contentTypes.includes('text/plain'));
            assert.equal(typeof MarkdownHandler.loadFile, 'function');
        });

        it('does convert a markdown file into a post object', function (done) {
            const filename = 'draft-2014-12-19-test-1.md';

            const file = [{
                path: testUtils.fixtures.getImportFixturePath(filename),
                name: filename
            }];

            MarkdownHandler.loadFile(file).then(function (result) {
                assert.equal(result.data.posts[0].markdown, 'You\'re live! Nice.');
                assert.equal(result.data.posts[0].status, 'draft');
                assert.equal(result.data.posts[0].slug, 'test-1');
                assert.equal(result.data.posts[0].title, 'test-1');
                assert.equal(result.data.posts[0].created_at, 1418990400000);
                assert.equal(moment.utc(result.data.posts[0].created_at).format('DD MM YY HH:mm'), '19 12 14 12:00');
                assert(!('image' in result.data.posts[0]));

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
                assert.equal(result.data.posts[0].markdown, 'You\'re live! Nice.');
                assert.equal(result.data.posts[0].status, 'draft');
                assert.equal(result.data.posts[0].slug, 'test-2');
                assert.equal(result.data.posts[0].title, 'Welcome to Ghost');
                assert.equal(result.data.posts[0].created_at, 1418990400000);
                assert(!('image' in result.data.posts[0]));

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
                assert.equal(result.data.posts[0].markdown, 'You\'re live! Nice.');
                assert.equal(result.data.posts[0].status, 'draft');
                assert.equal(result.data.posts[0].slug, 'test-3');
                assert.equal(result.data.posts[0].title, 'Welcome to Ghost');
                assert.equal(result.data.posts[0].created_at, 1418990400000);
                assert.equal(result.data.posts[0].image, '/images/kitten.jpg');

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
                assert.equal(result.data.posts[0].markdown, 'You\'re live! Nice.');
                assert.equal(result.data.posts[0].status, 'published');
                assert.equal(result.data.posts[0].slug, 'test-1');
                assert.equal(result.data.posts[0].title, 'Welcome to Ghost');
                assert.equal(result.data.posts[0].published_at, 1418990400000);
                assert.equal(moment.utc(result.data.posts[0].published_at).format('DD MM YY HH:mm'), '19 12 14 12:00');
                assert(!('image' in result.data.posts[0]));

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
                assert.equal(result.data.posts.length, 0);

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
                assert.equal(result.data.posts[one].markdown, 'You\'re live! Nice.');
                assert.equal(result.data.posts[one].status, 'published');
                assert.equal(result.data.posts[one].slug, 'test-1');
                assert.equal(result.data.posts[one].title, 'Welcome to Ghost');
                assert.equal(result.data.posts[one].published_at, 1418990400000);
                assert.equal(moment.utc(result.data.posts[one].published_at).format('DD MM YY HH:mm'), '19 12 14 12:00');
                assert(!('image' in result.data.posts[one]));

                // draft-2014-12-19-test-3.md
                assert.equal(result.data.posts[two].markdown, 'You\'re live! Nice.');
                assert.equal(result.data.posts[two].status, 'draft');
                assert.equal(result.data.posts[two].slug, 'test-3');
                assert.equal(result.data.posts[two].title, 'Welcome to Ghost');
                assert.equal(result.data.posts[two].created_at, 1418990400000);
                assert.equal(result.data.posts[two].image, '/images/kitten.jpg');

                done();
            }).catch(done);
        });
    });

    describe('DataImporter', function () {
        it('has the correct interface', function () {
            assert.equal(DataImporter.type, 'data');
            assert.equal(typeof DataImporter.preProcess, 'function');
            assert.equal(typeof DataImporter.doImport, 'function');
        });

        it('does preprocess posts, users and tags correctly', function () {
            const inputData = require('../../../../utils/fixtures/import/import-data-1.json');
            const outputData = DataImporter.preProcess(_.cloneDeep(inputData));

            // Data preprocess is a noop
            assert.deepEqual(inputData.data.data.posts[0], outputData.data.data.posts[0]);
            assert.deepEqual(inputData.data.data.tags[0], outputData.data.data.tags[0]);
            assert.deepEqual(inputData.data.data.users[0], outputData.data.data.users[0]);
        });
    });
});
