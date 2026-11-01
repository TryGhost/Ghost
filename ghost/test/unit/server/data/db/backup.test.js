const assert = require('node:assert/strict');
const os = require('os');
const path = require('path');
const sinon = require('sinon');
const fs = require('fs-extra');
const exporter = require('../../../../../core/server/data/exporter');
const dbBackup = require('../../../../../core/server/data/db/backup');
const configUtils = require('../../../../utils/config-utils');

describe('Backup', function () {
  let contentPath;
  let streamExportStub;
  let filenameStub;

  afterEach(async function () {
    sinon.restore();
    await configUtils.restore();
    await fs.remove(contentPath);
  });

  beforeEach(async function () {
    contentPath = await fs.mkdtemp(path.join(os.tmpdir(), 'ghost-backup-test-'));
    await fs.ensureDir(path.join(contentPath, 'data'));
    configUtils.set('paths:contentPath', contentPath);

    streamExportStub = sinon.stub(exporter, 'streamExport').callsFake(async function* () {
      yield '{"meta":{},"data":{';
      yield '"posts":[';
      yield '{"id":"1"}';
      yield ',{"id":"2"}';
      yield ']}}';
    });
    filenameStub = sinon.stub(exporter, 'fileName').resolves('test.json');
  });

  it('should stream the export to a backup JSON file', async function () {
    const options = { include: ['members'] };
    const filePath = await dbBackup.backup(options);

    assert.equal(filePath, path.join(contentPath, 'data', 'test.json'));
    sinon.assert.calledOnceWithExactly(filenameStub, options);
    sinon.assert.calledOnceWithExactly(streamExportStub, options);
    assert.deepEqual(await fs.readJson(filePath), {
      meta: {},
      data: { posts: [{ id: '1' }, { id: '2' }] },
    });
    assert.deepEqual(await fs.readdir(path.join(contentPath, 'data')), ['test.json']);
  });

  it('should not leave a partial file behind if the export fails', async function () {
    streamExportStub.callsFake(async function* () {
      yield '{"meta":{},"data":{';
      throw new Error('export failed');
    });

    await assert.rejects(dbBackup.backup(), /export failed/);

    assert.deepEqual(await fs.readdir(path.join(contentPath, 'data')), []);
  });

  it('should not create a backup JSON file if disabled', async function () {
    configUtils.set('disableJSBackups', true);

    assert.equal(await dbBackup.backup(), null);

    sinon.assert.notCalled(streamExportStub);
    sinon.assert.notCalled(filenameStub);
    assert.deepEqual(await fs.readdir(path.join(contentPath, 'data')), []);
  });
});
