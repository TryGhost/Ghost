var should = require('should'),
    sinon = require('sinon'),
    _ = require('lodash'),
    fs = require('fs-extra'),
    models = require('../../../../server/models'),
    exporter = require('../../../../server/data/exporter'),
    dbBackup = require('../../../../server/data/db/backup');

describe('Backup', function () {
    var exportStub, filenameStub, fsStub;

    before(function () {
        models.init();
    });

    afterEach(function () {
        sinon.restore();
    });

    beforeEach(function () {
        exportStub = sinon.stub(exporter, 'doExport').resolves();
        filenameStub = sinon.stub(exporter, 'fileName').resolves('test');
        fsStub = sinon.stub(fs, 'writeFile').resolves();
    });

    it('should create a backup JSON file', function (done) {
        dbBackup.backup().then(function () {
            exportStub.calledOnce.should.be.true();
            filenameStub.calledOnce.should.be.true();
            fsStub.calledOnce.should.be.true();

            done();
        }).catch(done);
    });
});
