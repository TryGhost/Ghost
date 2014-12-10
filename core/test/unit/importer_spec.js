/*globals describe, afterEach, it*/
/*jshint expr:true*/
var should  = require('should'),
    sinon   = require('sinon'),
    Promise = require('bluebird'),
    _       = require('lodash'),

    // Stuff we are testing
    ImportManager = require('../../server/data/importer'),
    JSONHandler   = require('../../server/data/importer/handlers/json'),
    DataImporter  = require('../../server/data/importer/importers/data'),

    sandbox = sinon.sandbox.create();

// To stop jshint complaining
should.equal(true, true);

describe('Importer', function () {
    afterEach(function () {
        sandbox.restore();
    });

    describe('ImportManager', function () {
        it('has the correct interface', function () {
            ImportManager.handlers.should.be.instanceof(Array).and.have.lengthOf(1);
            ImportManager.importers.should.be.instanceof(Array).and.have.lengthOf(1);
            ImportManager.loadFile.should.be.instanceof(Function);
            ImportManager.preProcess.should.be.instanceof(Function);
            ImportManager.doImport.should.be.instanceof(Function);
            ImportManager.generateReport.should.be.instanceof(Function);
        });

        it('gets the correct extensions', function () {
            ImportManager.getExtensions().should.be.instanceof(Array).and.have.lengthOf(2);
            ImportManager.getExtensions().should.containEql('.json');
            ImportManager.getExtensions().should.containEql('.zip');
        });

        it('gets the correct types', function () {
            ImportManager.getTypes().should.be.instanceof(Array).and.have.lengthOf(4);
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
                    getFileSpy = sandbox.stub(ImportManager, 'getFilesFromZip').returns(['/tmp/dir/myFile.json']),
                    jsonSpy = sandbox.stub(JSONHandler, 'loadFile').returns(Promise.resolve({posts: []})),
                    cleanSpy = sandbox.stub(ImportManager, 'cleanUp').returns(Promise.resolve());

                ImportManager.processZip(testZip).then(function (zipResult) {
                    extractSpy.calledOnce.should.be.true;
                    getFileSpy.calledOnce.should.be.true;
                    jsonSpy.calledOnce.should.be.true;
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

                    // The data importer should get the data object
                    expect = input.data;

                ImportManager.doImport(inputCopy).then(function (output) {
                    // eql checks for equality
                    // equal checks the references are for the same object
                    dataSpy.calledOnce.should.be.true;
                    dataSpy.getCall(0).args[0].should.eql(expect);
                    // we stubbed this as a noop but ImportManager calls with sequence, so we should get an array
                    output.should.eql([expect]);
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
    });

    describe('DataImporter', function () {
        it('has the correct interface', function () {
            DataImporter.type.should.eql('data');
            DataImporter.preProcess.should.be.instanceof(Function);
            DataImporter.doImport.should.be.instanceof(Function);
        });
    });
});
