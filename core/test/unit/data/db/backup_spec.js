var should = require('should'), // jshint ignore:line
    sinon = require('sinon'),
    rewire = require('rewire'),
    _ = require('lodash'),
    fs = require('fs-extra'),
    models = require('../../../../server/models'),
    exporter = require('../../../../server/data/export'),
    backupDatabase = rewire('../../../../server/data/db/backup'),
    sandbox = sinon.sandbox.create();

describe('Backup', function () {
    var exportStub, filenameStub, fsStub;

    before(function () {
        models.init();
    });

    afterEach(function () {
        sandbox.restore();
    });

    beforeEach(function () {
        exportStub = sandbox.stub(exporter, 'doExport').resolves();
        filenameStub = sandbox.stub(exporter, 'fileName').resolves('test');
        fsStub = sandbox.stub(fs, 'writeFile').resolves();
    });

    it('should create a backup JSON file', function (done) {
        backupDatabase().then(function () {
            exportStub.calledOnce.should.be.true();
            filenameStub.calledOnce.should.be.true();
            fsStub.calledOnce.should.be.true();

            done();
        }).catch(done);
    });
});
