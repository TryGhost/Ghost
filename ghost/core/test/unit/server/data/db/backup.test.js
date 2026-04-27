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

    beforeAll(function () {
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

    it('should create a backup JSON file', async function () {
        await new Promise((resolve, reject) => {
            const done = err => (err ? reject(err) : resolve());
            dbBackup.backup().then(function () {
                sinon.assert.calledOnce(exportStub);
                sinon.assert.calledOnce(filenameStub);
                sinon.assert.calledOnce(fsStub);

                done();
            }).catch(done);
        });
    });

    it('should not create a backup JSON file if disabled', async function () {
        await new Promise((resolve, reject) => {
            const done = err => (err ? reject(err) : resolve());
            configUtils.set('disableJSBackups', true);

            dbBackup.backup().then(function () {
                sinon.assert.notCalled(exportStub);
                sinon.assert.notCalled(filenameStub);
                sinon.assert.notCalled(fsStub);

                done();
            }).catch(done);
        });
    });
});
