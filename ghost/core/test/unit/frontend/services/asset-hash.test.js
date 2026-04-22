const assert = require('node:assert/strict');
const sinon = require('sinon');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const assetHash = require('../../../../core/frontend/services/asset-hash');

describe('Asset Hash Service', function () {
    const fixturesPath = path.join(__dirname, '../../../utils/fixtures/themes/casper');

    afterEach(function () {
        sinon.restore();
        assetHash.clearCache();
    });

    describe('getHashForFile', function () {
        it('should return a SHA256 hash for a valid file', function () {
            const testFilePath = path.join(fixturesPath, 'package.json');
            const hash = assetHash.getHashForFile(testFilePath);

            // Hash should be a 16-character base64url string (first 16 chars of SHA256)
            assert.ok(hash);
            assert.equal(typeof hash, 'string');
            assert.equal(hash.length, 16);
            assert.match(hash, /^[A-Za-z0-9_-]{16}$/);
        });

        it('should return the same hash for the same file content', function () {
            const testFilePath = path.join(fixturesPath, 'package.json');
            const hash1 = assetHash.getHashForFile(testFilePath);
            const hash2 = assetHash.getHashForFile(testFilePath);

            assert.equal(hash1, hash2);
        });

        it('should return different hashes for different file contents', function () {
            const file1 = path.join(fixturesPath, 'package.json');
            const file2 = path.join(fixturesPath, 'index.hbs');

            const hash1 = assetHash.getHashForFile(file1);
            const hash2 = assetHash.getHashForFile(file2);

            assert.notEqual(hash1, hash2);
        });

        it('should return null for non-existent file', function () {
            const nonExistentPath = path.join(fixturesPath, 'does-not-exist.js');
            const hash = assetHash.getHashForFile(nonExistentPath);

            assert.equal(hash, null);
        });

        it('should cache hashes and not re-read file on subsequent calls', function () {
            const testFilePath = path.join(fixturesPath, 'package.json');
            const readFileSyncSpy = sinon.spy(fs, 'readFileSync');

            // First call - should read file
            assetHash.getHashForFile(testFilePath);
            sinon.assert.calledOnce(readFileSyncSpy);

            // Second call - should use cache
            assetHash.getHashForFile(testFilePath);
            sinon.assert.calledOnce(readFileSyncSpy); // Still 1, not 2
        });

        it('should re-read file if mtime has changed', function () {
            const testFilePath = path.join(fixturesPath, 'package.json');
            const originalStat = fs.statSync(testFilePath);
            const readFileSyncSpy = sinon.spy(fs, 'readFileSync');

            // First call
            const hash1 = assetHash.getHashForFile(testFilePath);
            sinon.assert.calledOnce(readFileSyncSpy);

            // Simulate mtime change by stubbing statSync
            const futureTime = new Date(originalStat.mtimeMs + 1000);
            sinon.stub(fs, 'statSync').returns({
                mtimeMs: futureTime.getTime()
            });

            // Clear cache entry by calling with different mtime
            // The service should detect mtime change and re-read
            const hash2 = assetHash.getHashForFile(testFilePath);
            sinon.assert.calledTwice(readFileSyncSpy); // File was re-read

            // Both hashes should be the same (same content) but cache was invalidated
            assert.equal(hash1, hash2);
        });
    });

    describe('clearCache', function () {
        it('should clear all cached hashes', function () {
            const testFilePath = path.join(fixturesPath, 'package.json');
            const readFileSyncSpy = sinon.spy(fs, 'readFileSync');

            // First call - should read file
            assetHash.getHashForFile(testFilePath);
            sinon.assert.calledOnce(readFileSyncSpy);

            // Clear cache
            assetHash.clearCache();

            // Next call should read file again
            assetHash.getHashForFile(testFilePath);
            sinon.assert.calledTwice(readFileSyncSpy);
        });
    });

    describe('hash consistency', function () {
        it('should produce consistent hash for known content', function () {
            // Create a predictable test by using known content
            const knownContent = 'test content for hashing';
            const expectedHash = crypto.createHash('sha256')
                .update(knownContent)
                .digest('base64url')
                .substring(0, 16);

            // Stub fs to return known content
            sinon.stub(fs, 'statSync').returns({mtimeMs: 12345});
            sinon.stub(fs, 'readFileSync').returns(knownContent);

            const hash = assetHash.getHashForFile('/fake/path/file.js');
            assert.equal(hash, expectedHash);
        });
    });
});
