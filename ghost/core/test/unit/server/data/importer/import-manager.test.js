const assert = require('node:assert/strict');
const fs = require('fs-extra');
const path = require('path');
const sinon = require('sinon');
const { globSync } = require('glob');
const importManager = require('../../../../../core/server/data/importer/import-manager');

describe('Import Manager', function () {
  afterEach(function () {
    sinon.restore();
  });

  it('delegates archive inspection to the shared archive helper', function () {
    const getGlobPattern = sinon.stub(importManager.archive, 'getGlobPattern').returns('glob');
    const getExtensionGlob = sinon
      .stub(importManager.archive, 'getExtensionGlob')
      .returns('extension glob');
    const getDirectoryGlob = sinon
      .stub(importManager.archive, 'getDirectoryGlob')
      .returns('directory glob');
    const isValid = sinon.stub(importManager.archive, 'isValid').returns(true);
    const getFiles = sinon
      .stub(importManager.archive, 'getFiles')
      .returns([{ name: 'posts.json' }]);
    const getBaseDirectory = sinon
      .stub(importManager.archive, 'getBaseDirectory')
      .returns('export');

    assert.equal(importManager.getGlobPattern(['.json']), 'glob');
    assert.equal(importManager.getExtensionGlob(['.json'], 1), 'extension glob');
    assert.equal(importManager.getDirectoryGlob(['content'], 2), 'directory glob');
    assert.equal(importManager.isValidZip('/tmp/export'), true);
    assert.deepEqual(importManager.getFilesFromZip({ extensions: ['.json'] }, '/tmp/export'), [
      { name: 'posts.json' },
    ]);
    assert.equal(importManager.getBaseDirectory('/tmp/export'), 'export');

    sinon.assert.calledOnceWithExactly(getGlobPattern, ['.json']);
    sinon.assert.calledOnceWithExactly(getExtensionGlob, ['.json'], 1);
    sinon.assert.calledOnceWithExactly(getDirectoryGlob, ['content'], 2);
    sinon.assert.calledOnceWithExactly(isValid, '/tmp/export');
    sinon.assert.calledOnceWithExactly(getFiles, '/tmp/export', ['.json']);
    sinon.assert.calledOnceWithExactly(getBaseDirectory, '/tmp/export');
  });

  describe('extractZip', function () {
    it('extracts zip file and sets correct file permissions', async function () {
      const zipPath = path.join(__dirname, '/test.zip');
      const extractedPath = await importManager.extractZip(zipPath);
      try {
        const files = globSync('**/*', { cwd: extractedPath, nodir: true });
        files.forEach((file) => {
          const filePath = path.join(extractedPath, file);
          const stats = fs.statSync(filePath);
          const fileMode = stats.mode & 0o777;
          assert.equal(fileMode, 0o644, `File ${file} should have 0644 permissions`);
        });
      } finally {
        await fs.remove(extractedPath);
      }
    });
  });
});
