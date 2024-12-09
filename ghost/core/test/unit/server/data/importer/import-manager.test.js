const should = require('should');
const sinon = require('sinon');
const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const glob = require('glob');
const {extract} = require('@tryghost/zip');
const errors = require('@tryghost/errors');
const ImportManager = require('../../../../../core/server/data/importer/import-manager');

describe('Import Manager', function () {
    let importManager;
    const fakeUuid = '12345678-1234-1234-1234-123456789abc';

    beforeEach(function () {
        importManager = new ImportManager();
        
        // Common stubs used across multiple tests
        sinon.stub(crypto, 'randomUUID').returns(fakeUuid);
        sinon.stub(extract);
        sinon.stub(fs, 'chmod').resolves();
        sinon.stub(glob, 'sync');
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('extractZip', function () {
        it('extracts zip and sets correct permissions', async function () {
            // Arrange
            const filePath = '/fake/path/file.zip';
            const expectedTmpDir = path.join(os.tmpdir(), fakeUuid);
            glob.sync.returns(['file1.txt', 'dir/file2.txt']);
            extract.resolves();

            // Act
            const result = await importManager.extractZip(filePath);

            // Assert
            sinon.assert.calledOnce(extract);
            sinon.assert.calledWith(extract, filePath, expectedTmpDir);

            sinon.assert.calledWith(glob.sync, '**/*', {cwd: expectedTmpDir, nodir: true});
            sinon.assert.calledTwice(fs.chmod);
            sinon.assert.calledWith(fs.chmod, path.join(expectedTmpDir, 'file1.txt'), 0o644);
            sinon.assert.calledWith(fs.chmod, path.join(expectedTmpDir, 'dir/file2.txt'), 0o644);

            result.should.equal(expectedTmpDir);
            importManager.fileToDelete.should.equal(expectedTmpDir);
        });

        it('handles MacOS zip encoding error', async function () {
            // Arrange
            const filePath = '/fake/path/file.zip';
            extract.rejects(new Error('ENAMETOOLONG: name too long'));

            // Act & Assert
            await should(importManager.extractZip(filePath))
                .be.rejectedWith(errors.UnsupportedMediaTypeError, {
                    code: 'INVALID_ZIP_FILE_NAME_ENCODING'
                });
        });

        it('handles invalid zip file error', async function () {
            // Arrange
            const filePath = '/fake/path/file.zip';
            extract.rejects(new Error('end of central directory record signature not found'));

            // Act & Assert
            await should(importManager.extractZip(filePath))
                .be.rejectedWith(errors.UnsupportedMediaTypeError, {
                    code: 'INVALID_ZIP_FILE'
                });
        });

        it('passes through other errors', async function () {
            // Arrange
            const filePath = '/fake/path/file.zip';
            const testError = new Error('something else went wrong');
            extract.rejects(testError);

            // Act & Assert
            await should(importManager.extractZip(filePath))
                .be.rejectedWith(testError);
        });
    });

    describe('doImport', function () {
        it('should import data with a valid data object', async function () {
            // Arrange
            const data = {
                data: {
                    posts: []
                }
            };

            // Act
            const result = await importManager.doImport(data);

            // Assert
            should.exist(result);
            result.should.be.an.Object();
        });

        it('should fail without required data object', async function () {
            // Act & Assert
            await should(importManager.doImport())
                .be.rejectedWith(/Failed to import/);
        });
    });

    describe('loadFile', function () {
        it('should load a valid file', async function () {
            // Arrange
            const file = {
                name: 'test.json',
                path: '/test/path'
            };

            // Act
            const result = await importManager.loadFile(file);

            // Assert
            should.exist(result);
            result.should.be.an.Object();
        });

        it('should fail with invalid file format', async function () {
            // Arrange
            const file = {
                name: 'test.txt', 
                path: '/test/path'
            };

            // Act & Assert
            await should(importManager.loadFile(file))
                .be.rejectedWith(/Unsupported file format/);
        });
    });
}); 