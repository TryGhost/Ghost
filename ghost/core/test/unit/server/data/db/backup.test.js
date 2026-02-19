const assert = require('node:assert/strict');
const sinon = require('sinon');
const fs = require('fs-extra');
const models = require('../../../../../core/server/models');
const exporter = require('../../../../../core/server/data/exporter');
const dbBackup = require('../../../../../core/server/data/db/backup');
const configUtils = require('../../../../utils/config-utils');

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
            assert.equal(exportStub.calledOnce, true);
            assert.equal(filenameStub.calledOnce, true);
            assert.equal(fsStub.calledOnce, true);

            done();
        }).catch(done);
    });

    it('should not create a backup JSON file if disabled', function (done) {
        configUtils.set('disableJSBackups', true);

        dbBackup.backup().then(function () {
            assert.equal(exportStub.called, false);
            assert.equal(filenameStub.called, false);
            assert.equal(fsStub.called, false);

            done();
        }).catch(done);
    });
});
