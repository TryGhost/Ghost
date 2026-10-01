import assert from 'node:assert/strict';
import fs from 'fs-extra';
import path from 'path';
import { globSync } from 'glob';
// @ts-expect-error This module lacks type definitions.
import importManager from '../../../../../core/server/data/importer/import-manager';

describe('Import Manager', function () {
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
