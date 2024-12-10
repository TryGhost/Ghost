const should = require('should');
const fs = require('fs-extra');
const path = require('path');
const glob = require('glob');
const importManager = require('../../../../../core/server/data/importer/import-manager');

describe('Import Manager', function () {
    describe('extractZip', function () {
        it('extracts zip file and sets correct file permissions', async function () {
            const zipPath = path.join(__dirname, '/test.zip');
            const extractedPath = await importManager.extractZip(zipPath);
            try {
                const files = glob.sync('**/*', {cwd: extractedPath, nodir: true});
                files.forEach((file) => {
                    const filePath = path.join(extractedPath, file);
                    const stats = fs.statSync(filePath);
                    const fileMode = stats.mode & 0o777;
                    should.equal(fileMode, 0o644, `File ${file} should have 0644 permissions`);
                });
            } finally {
                await fs.remove(extractedPath);
            }
        });
    });
});
