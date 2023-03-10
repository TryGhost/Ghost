const should = require('should');
const sinon = require('sinon');
const fs = require('fs-extra');
const models = require('../../../../../core/server/models');
const exporter = require('../../../../../core/server/data/exporter');
const dbBackup = require('../../../../../core/server/data/db/backup');

describe('Backup', function () {
    let exportStub;
    let filenameStub;
    let fsStub;

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
