const assert = require('node:assert/strict');
const os = require('os');
const path = require('path');
const sinon = require('sinon');
const fs = require('fs-extra');
const exporter = require('../../../../../core/server/data/exporter');
const dbBackup = require('../../../../../core/server/data/db/backup');
const configUtils = require('../../../../utils/config-utils');

describe('Backup', function () {
  const exportData = {
    meta: { exported_on: 1700000000000, version: '6.0.0' },
    data: { posts: [{ id: '1', title: 'Hello' }], tags: [] },
  };

  let contentPath;
  let exportStub;
  let filenameStub;

  beforeEach(async function () {
    contentPath = await fs.mkdtemp(path.join(os.tmpdir(), 'backup-test-'));
    await fs.ensureDir(path.join(contentPath, 'data'));
    configUtils.set('paths:contentPath', contentPath);

    exportStub = sinon.stub(exporter, 'doExport').resolves(exportData);
    filenameStub = sinon.stub(exporter, 'fileName').resolves('test.json');
  });

  afterEach(async function () {
    sinon.restore();
    await configUtils.restore();
    await fs.remove(contentPath);
  });

  it('should create a backup JSON file', async function () {
    const filePath = await dbBackup.backup();

    sinon.assert.calledOnce(exportStub);
    sinon.assert.calledOnce(filenameStub);
    assert.equal(filePath, path.join(contentPath, 'data', 'test.json'));
    assert.equal(await fs.readFile(filePath, 'utf8'), JSON.stringify(exportData));
  });

  it('should stream back a backup it wrote', async function () {
    await dbBackup.backup();

    const stream = await dbBackup.readBackupStream('test.json');
    const chunks = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }

    assert.deepEqual(JSON.parse(Buffer.concat(chunks).toString('utf8')), exportData);
  });

  it('should only read backups from the data directory', async function () {
    await dbBackup.backup();

    const stream = await dbBackup.readBackupStream('../data/test.json');
    assert.ok(stream, 'path segments are ignored');
    stream.destroy();

    assert.equal(await dbBackup.readBackupStream('missing.json'), null);
  });

  it('should remove a partially written file when serialization fails', async function () {
    exportStub.resolves({ data: { posts: [{ id: '1' }, { count: 1n }] } });

    await assert.rejects(dbBackup.backup(), TypeError);
    assert.equal(await fs.pathExists(path.join(contentPath, 'data', 'test.json')), false);
  });

  it('should not create a backup JSON file if disabled', async function () {
    configUtils.set('disableJSBackups', true);

    assert.equal(await dbBackup.backup(), null);

    sinon.assert.notCalled(exportStub);
    sinon.assert.notCalled(filenameStub);
    assert.deepEqual(await fs.readdir(path.join(contentPath, 'data')), []);
  });
});
