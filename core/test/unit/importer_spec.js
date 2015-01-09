/*globals describe, afterEach, it*/
/*jshint expr:true*/
var should    = require('should'),
    sinon     = require('sinon'),
    Promise   = require('bluebird'),
    _         = require('lodash'),
    testUtils = require('../utils'),
    moment    = require('moment'),
    config    = require('../../server/config'),
    path      = require('path'),
    errors    = require('../../server/errors'),

    // Stuff we are testing
    ImportManager   = require('../../server/data/importer'),
    JSONHandler     = require('../../server/data/importer/handlers/json'),
    ImageHandler    = require('../../server/data/importer/handlers/image'),
    MarkdownHandler = require('../../server/data/importer/handlers/markdown'),
    DataImporter    = require('../../server/data/importer/importers/data'),
    ImageImporter   = require('../../server/data/importer/importers/image'),

    storage = require('../../server/storage'),
    sandbox = sinon.sandbox.create();

// To stop jshint complaining
should.equal(true, true);

describe('Importer', function () {
    afterEach(function () {
        sandbox.restore();
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
            ImportManager.getExtensions().should.be.instanceof(Array).and.have.lengthOf(10);
            ImportManager.getExtensions().should.containEql('.json');
            ImportManager.getExtensions().should.containEql('.zip');
            ImportManager.getExtensions().should.containEql('.jpg');
            ImportManager.getExtensions().should.containEql('.md');
        });

        it('gets the correct types', function () {
            ImportManager.getTypes().should.be.instanceof(Array).and.have.lengthOf(10);
            ImportManager.getTypes().should.containEql('application/octet-stream');
            ImportManager.getTypes().should.containEql('application/json');
            ImportManager.getTypes().should.containEql('application/zip');
            ImportManager.getTypes().should.containEql('application/x-zip-compressed');
            ImportManager.getTypes().should.containEql('text/plain');
        });

        it('gets the correct directories', function () {
            ImportManager.getDirectories().should.be.instanceof(Array).and.have.lengthOf(2);
            ImportManager.getDirectories().should.containEql('images');
            ImportManager.getDirectories().should.containEql('content');
        });

        it('globs extensions correctly', function () {
            ImportManager.getGlobPattern(ImportManager.getExtensions())
                .should.equal('+(.jpg|.jpeg|.gif|.png|.svg|.svgz|.json|.md|.markdown|.zip)');
            ImportManager.getGlobPattern(ImportManager.getDirectories())
                .should.equal('+(images|content)');
            ImportManager.getGlobPattern(JSONHandler.extensions)
                .should.equal('+(.json)');
            ImportManager.getGlobPattern(ImageHandler.extensions)
                .should.equal('+(.jpg|.jpeg|.gif|.png|.svg|.svgz)');
            ImportManager.getExtensionGlob(ImportManager.getExtensions())
                .should.equal('*+(.jpg|.jpeg|.gif|.png|.svg|.svgz|.json|.md|.markdown|.zip)');
            ImportManager.getDirectoryGlob(ImportManager.getDirectories())
                .should.equal('+(images|content)');
            ImportManager.getExtensionGlob(ImportManager.getExtensions(), 0)
                .should.equal('*+(.jpg|.jpeg|.gif|.png|.svg|.svgz|.json|.md|.markdown|.zip)');
            ImportManager.getDirectoryGlob(ImportManager.getDirectories(), 0)
                .should.equal('+(images|content)');
            ImportManager.getExtensionGlob(ImportManager.getExtensions(), 1)
                .should.equal('{*/*,*}+(.jpg|.jpeg|.gif|.png|.svg|.svgz|.json|.md|.markdown|.zip)');
            ImportManager.getDirectoryGlob(ImportManager.getDirectories(), 1)
                .should.equal('{*/,}+(images|content)');
            ImportManager.getExtensionGlob(ImportManager.getExtensions(), 2)
                .should.equal('**/*+(.jpg|.jpeg|.gif|.png|.svg|.svgz|.json|.md|.markdown|.zip)');
            ImportManager.getDirectoryGlob(ImportManager.getDirectories(), 2)
                .should.equal('**/+(images|content)');
        });

        // Step 1 of importing is loadFile
        describe('loadFile', function () {
            it('knows when to process a file', function (done) {
                var testFile = {name: 'myFile.json', path: '/my/path/myFile.json'},
                    zipSpy = sandbox.stub(ImportManager, 'processZip').returns(Promise.resolve()),
                    fileSpy = sandbox.stub(ImportManager, 'processFile').returns(Promise.resolve());

                ImportManager.loadFile(testFile).then(function () {
                    zipSpy.calledOnce.should.be.false;
                    fileSpy.calledOnce.should.be.true;
                    done();
                }).catch(done);
            });

            // We need to make sure we don't actually extract a zip and leave temporary files everywhere!
            it('knows when to process a zip', function (done) {
                var testZip = {name: 'myFile.zip', path: '/my/path/myFile.zip'},
                    zipSpy = sandbox.stub(ImportManager, 'processZip').returns(Promise.resolve()),
                    fileSpy = sandbox.stub(ImportManager, 'processFile').returns(Promise.resolve());

                ImportManager.loadFile(testZip).then(function () {
                    zipSpy.calledOnce.should.be.true;
                    fileSpy.calledOnce.should.be.false;
                    done();
                }).catch(done);
            });

            it('has same result for zips and files', function (done) {
                var testFile = {name: 'myFile.json', path: '/my/path/myFile.json'},
                    testZip = {name: 'myFile.zip', path: '/my/path/myFile.zip'},
                    // need to stub out the extract and glob function for zip
                    extractSpy = sandbox.stub(ImportManager, 'extractZip').returns(Promise.resolve('/tmp/dir/')),
                    validSpy = sandbox.stub(ImportManager, 'isValidZip').returns(true),
                    baseDirSpy = sandbox.stub(ImportManager, 'getBaseDirectory').returns(),
                    getFileSpy = sandbox.stub(ImportManager, 'getFilesFromZip'),
                    jsonSpy = sandbox.stub(JSONHandler, 'loadFile').returns(Promise.resolve({posts: []})),
                    imageSpy = sandbox.stub(ImageHandler, 'loadFile'),
                    mdSpy = sandbox.stub(MarkdownHandler, 'loadFile');

                getFileSpy.withArgs(JSONHandler).returns(['/tmp/dir/myFile.json']);
                getFileSpy.withArgs(ImageHandler).returns([]);
                getFileSpy.withArgs(MarkdownHandler).returns([]);

                ImportManager.processZip(testZip).then(function (zipResult) {
                    extractSpy.calledOnce.should.be.true;
                    validSpy.calledOnce.should.be.true;
                    baseDirSpy.calledOnce.should.be.true;
                    getFileSpy.calledThrice.should.be.true;
                    jsonSpy.calledOnce.should.be.true;
                    imageSpy.called.should.be.false;
                    mdSpy.called.should.be.false;

                    ImportManager.processFile(testFile, '.json').then(function (fileResult) {
                        jsonSpy.calledTwice.should.be.true;

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
                    var testDir = path.resolve('core/test/utils/fixtures/import/zips/zip-with-base-dir');

                    ImportManager.isValidZip(testDir).should.be.ok;
                });

                it('accepts a zip without a base directory', function () {
                    var testDir = path.resolve('core/test/utils/fixtures/import/zips/zip-without-base-dir');

                    ImportManager.isValidZip(testDir).should.be.ok;
                });

                it('accepts a zip with an image directory', function () {
                    var testDir = path.resolve('core/test/utils/fixtures/import/zips/zip-image-dir');

                    ImportManager.isValidZip(testDir).should.be.ok;
                });

                it('fails a zip with two base directories', function () {
                    var testDir = path.resolve('core/test/utils/fixtures/import/zips/zip-with-double-base-dir');

                    ImportManager.isValidZip.bind(ImportManager, testDir).should.throw(errors.UnsupportedMediaTypeError);
                });

                it('fails a zip with no content', function () {
                    var testDir = path.resolve('core/test/utils/fixtures/import/zips/zip-invalid');

                    ImportManager.isValidZip.bind(ImportManager, testDir).should.throw(errors.UnsupportedMediaTypeError);
                });

                it('shows a special error for old Roon exports', function () {
                    var testDir = path.resolve('core/test/utils/fixtures/import/zips/zip-old-roon-export'),
                        msg = 'Your zip file looks like an old format Roon export, ' +
                            'please re-export your Roon blog and try again.';

                    ImportManager.isValidZip.bind(ImportManager, testDir).should.throw(errors.UnsupportedMediaTypeError);
                    ImportManager.isValidZip.bind(ImportManager, testDir).should.throw(msg);
                });
            });

            describe('Get Base Dir', function () {
                it('returns string for base directory', function () {
                    var testDir = path.resolve('core/test/utils/fixtures/import/zips/zip-with-base-dir');

                    ImportManager.getBaseDirectory(testDir).should.equal('basedir');
                });

                it('returns empty for no base directory', function () {
                    var testDir = path.resolve('core/test/utils/fixtures/import/zips/zip-without-base-dir');

                    should.not.exist(ImportManager.getBaseDirectory(testDir));
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
                    dataSpy = sandbox.spy(DataImporter, 'preProcess'),
                    imageSpy = sandbox.spy(ImageImporter, 'preProcess');

                ImportManager.preProcess(inputCopy).then(function (output) {
                    dataSpy.calledOnce.should.be.true;
                    dataSpy.calledWith(inputCopy).should.be.true;
                    imageSpy.calledOnce.should.be.true;
                    imageSpy.calledWith(inputCopy).should.be.true;
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
                }).catch(done);
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
                }).catch(done);
            });
        });

        describe('importFromFile', function () {
            it('does the import steps in order', function (done) {
                var loadFileSpy = sandbox.stub(ImportManager, 'loadFile').returns(Promise.resolve()),
                    preProcessSpy = sandbox.stub(ImportManager, 'preProcess').returns(Promise.resolve()),
                    doImportSpy = sandbox.stub(ImportManager, 'doImport').returns(Promise.resolve()),
                    generateReportSpy = sandbox.stub(ImportManager, 'generateReport').returns(Promise.resolve()),
                    cleanupSpy = sandbox.stub(ImportManager, 'cleanUp').returns({});

                ImportManager.importFromFile({}).then(function () {
                    loadFileSpy.calledOnce.should.be.true;
                    preProcessSpy.calledOnce.should.be.true;
                    doImportSpy.calledOnce.should.be.true;
                    generateReportSpy.calledOnce.should.be.true;
                    cleanupSpy.calledOnce.should.be.true;
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
            }).catch(done);
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
            }).catch(done);
        });
    });

    describe('ImageHandler', function () {
        var origConfig = _.cloneDeep(config),
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
                storeSpy.firstCall.args[1].targetDir.should.match(/(\/|\\)content(\/|\\)images$/);
                storeSpy.firstCall.args[1].newPath.should.eql('/content/images/test-image.jpeg');

                done();
            }).catch(done);
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
                storeSpy.firstCall.args[1].targetDir.should.match(/(\/|\\)content(\/|\\)images(\/|\\)photos$/);
                storeSpy.firstCall.args[1].newPath.should.eql('/content/images/photos/my-cat.jpeg');

                done();
            }).catch(done);
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
                storeSpy.firstCall.args[1].targetDir.should.match(/(\/|\\)content(\/|\\)images$/);
                storeSpy.firstCall.args[1].newPath.should.eql('/content/images/my-cat.jpeg');

                done();
            }).catch(done);
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
                storeSpy.firstCall.args[1].targetDir.should.match(/(\/|\\)content(\/|\\)images$/);
                storeSpy.firstCall.args[1].newPath.should.eql('/subdir/content/images/test-image.jpeg');

                done();
            }).catch(done);
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
                storeSpy.firstCall.args[1].targetDir.should.match(/(\/|\\)content(\/|\\)images$/);
                storeSpy.firstCall.args[1].newPath.should.eql('/content/images/testing.png');
                storeSpy.secondCall.args[1].originalPath.should.equal('photo/kitten.jpg');
                storeSpy.secondCall.args[1].targetDir.should.match(/(\/|\\)content(\/|\\)images(\/|\\)photo$/);
                storeSpy.secondCall.args[1].newPath.should.eql('/content/images/photo/kitten.jpg');
                storeSpy.thirdCall.args[1].originalPath.should.equal('content/images/animated/bunny.gif');
                storeSpy.thirdCall.args[1].targetDir.should.match(/(\/|\\)content(\/|\\)images(\/|\\)animated$/);
                storeSpy.thirdCall.args[1].newPath.should.eql('/content/images/animated/bunny.gif');
                storeSpy.lastCall.args[1].originalPath.should.equal('images/puppy.jpg');
                storeSpy.lastCall.args[1].targetDir.should.match(/(\/|\\)content(\/|\\)images$/);
                storeSpy.lastCall.args[1].newPath.should.eql('/content/images/puppy.jpg');

                done();
            });
        });
    });

    describe('MarkdownHandler', function () {
        it('has the correct interface', function () {
            MarkdownHandler.type.should.eql('data');
            MarkdownHandler.extensions.should.be.instanceof(Array).and.have.lengthOf(2);
            MarkdownHandler.extensions.should.containEql('.md');
            MarkdownHandler.extensions.should.containEql('.markdown');
            MarkdownHandler.types.should.be.instanceof(Array).and.have.lengthOf(2);
            MarkdownHandler.types.should.containEql('application/octet-stream');
            MarkdownHandler.types.should.containEql('text/plain');
            MarkdownHandler.loadFile.should.be.instanceof(Function);
        });

        it('does convert a markdown file into a post object', function (done) {
            var filename = 'draft-2014-12-19-test-1.md',
                file = [{
                    path: testUtils.fixtures.getImportFixturePath(filename),
                    name: filename
                }];

            MarkdownHandler.loadFile(file).then(function (result) {
                result.data.posts[0].markdown.should.eql('You\'re live! Nice.');
                result.data.posts[0].status.should.eql('draft');
                result.data.posts[0].slug.should.eql('test-1');
                result.data.posts[0].title.should.eql('test-1');
                result.data.posts[0].created_at.should.eql(1418990400000);
                moment(result.data.posts[0].created_at).format('DD MM YY HH:mm').should.eql('19 12 14 12:00');
                result.data.posts[0].should.not.have.property('image');

                done();
            });
        });

        it('can parse a title from a markdown file', function (done) {
            var filename = 'draft-2014-12-19-test-2.md',
                file = [{
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
            });
        });

        it('can parse a featured image from a markdown file if there is a title', function (done) {
            var filename = 'draft-2014-12-19-test-3.md',
                file = [{
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
            });
        });

        it('can import a published post', function (done) {
            var filename = 'published-2014-12-19-test-1.md',
                file = [{
                    path: testUtils.fixtures.getImportFixturePath(filename),
                    name: filename
                }];

            MarkdownHandler.loadFile(file).then(function (result) {
                result.data.posts[0].markdown.should.eql('You\'re live! Nice.');
                result.data.posts[0].status.should.eql('published');
                result.data.posts[0].slug.should.eql('test-1');
                result.data.posts[0].title.should.eql('Welcome to Ghost');
                result.data.posts[0].published_at.should.eql(1418990400000);
                moment(result.data.posts[0].published_at).format('DD MM YY HH:mm').should.eql('19 12 14 12:00');
                result.data.posts[0].should.not.have.property('image');

                done();
            });
        });

        it('does not import deleted posts', function (done) {
            var filename = 'deleted-2014-12-19-test-1.md',
                file = [{
                    path: testUtils.fixtures.getImportFixturePath(filename),
                    name: filename
                }];

            MarkdownHandler.loadFile(file).then(function (result) {
                result.data.posts.should.be.empty;

                done();
            });
        });

        it('can import multiple files', function (done) {
            var files = [{
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

                // published-2014-12-19-test-1.md
                result.data.posts[0].markdown.should.eql('You\'re live! Nice.');
                result.data.posts[0].status.should.eql('published');
                result.data.posts[0].slug.should.eql('test-1');
                result.data.posts[0].title.should.eql('Welcome to Ghost');
                result.data.posts[0].published_at.should.eql(1418990400000);
                moment(result.data.posts[0].published_at).format('DD MM YY HH:mm').should.eql('19 12 14 12:00');
                result.data.posts[0].should.not.have.property('image');

                // draft-2014-12-19-test-3.md
                result.data.posts[1].markdown.should.eql('You\'re live! Nice.');
                result.data.posts[1].status.should.eql('draft');
                result.data.posts[1].slug.should.eql('test-3');
                result.data.posts[1].title.should.eql('Welcome to Ghost');
                result.data.posts[1].created_at.should.eql(1418990400000);
                result.data.posts[1].image.should.eql('/images/kitten.jpg');

                done();
            }).catch(done);
        });
    });

    describe('DataImporter', function () {
        var importer = require('../../server/data/import');

        it('has the correct interface', function () {
            DataImporter.type.should.eql('data');
            DataImporter.preProcess.should.be.instanceof(Function);
            DataImporter.doImport.should.be.instanceof(Function);
        });

        it('does preprocess posts, users and tags correctly', function () {
            var inputData = require('../utils/fixtures/import/import-data-1.json'),
                outputData = DataImporter.preProcess(_.cloneDeep(inputData));

            // Data preprocess is a noop
            inputData.data.data.posts[0].should.eql(outputData.data.data.posts[0]);
            inputData.data.data.tags[0].should.eql(outputData.data.data.tags[0]);
            inputData.data.data.users[0].should.eql(outputData.data.data.users[0]);
        });

        it('does import the data correctly', function () {
            var inputData = require('../utils/fixtures/import/import-data-1.json'),
               importerSpy = sandbox.stub(importer, 'doImport').returns(Promise.resolve());

            DataImporter.doImport(inputData.data).then(function () {
                importerSpy.calledOnce.should.be.true;
                importerSpy.calledWith(inputData.data).should.be.true;
            });
        });
    });

    describe('ImageImporter', function () {
        it('has the correct interface', function () {
            ImageImporter.type.should.eql('images');
            ImageImporter.preProcess.should.be.instanceof(Function);
            ImageImporter.doImport.should.be.instanceof(Function);
        });

        it('does preprocess posts, users and tags correctly', function () {
            var inputData = require('../utils/fixtures/import/import-data-1.json'),
                outputData = ImageImporter.preProcess(_.cloneDeep(inputData));

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

            inputData.posts[0].image.should.eql('/images/my-image.png');
            outputData.posts[0].image.should.eql('/content/images/my-image.png');

            inputData.tags[0].image.should.eql('/images/my-image.png');
            outputData.tags[0].image.should.eql('/content/images/my-image.png');

            inputData.users[0].image.should.eql('/images/my-image.png');
            inputData.users[0].cover.should.eql('/images/photos/cat.jpg');
            outputData.users[0].image.should.eql('/content/images/my-image.png');
            outputData.users[0].cover.should.eql('/content/images/photos/cat.jpg');
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
