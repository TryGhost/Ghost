const sinon = require('sinon');
const fs = require('fs-extra');
const exporter = require('../../../../../core/server/data/exporter');
const dbBackup = require('../../../../../core/server/data/db/backup');
const configUtils = require('../../../../utils/config-utils');

describe('Backup', function () {
    let exportStub;
    let filenameStub;
    let fsStub;

    afterEach(function () {
        sinon.restore();
    });

    beforeEach(function () {
        exportStub = sinon.stub(exporter, 'doExport').resolves();
        filenameStub = sinon.stub(exporter, 'fileName').resolves('test');
        fsStub = sinon.stub(fs, 'writeFile').resolves();
    });

    it('should create a backup JSON file', async function () {
        await dbBackup.backup();

        sinon.assert.calledOnce(exportStub);
        sinon.assert.calledOnce(filenameStub);
        sinon.assert.calledOnce(fsStub);
    });

    it('should not create a backup JSON file if disabled', async function () {
        configUtils.set('disableJSBackups', true);

        await dbBackup.backup();

        sinon.assert.notCalled(exportStub);
        sinon.assert.notCalled(filenameStub);
        sinon.assert.notCalled(fsStub);
    });
});
