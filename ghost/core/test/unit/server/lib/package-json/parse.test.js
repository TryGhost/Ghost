const assert = require('node:assert/strict');

const tmp = require('tmp');
const fs = require('fs-extra');
const parse = require('../../../../../core/server/lib/package-json/parse');

describe('package-json parse', function () {
    it('should parse valid package.json', async function () {
        const tmpFile = tmp.fileSync();
        const pkgJson = JSON.stringify({
            name: 'test',
            version: '0.0.0'
        });

        fs.writeSync(tmpFile.fd, pkgJson);

        try {
            const pkg = await parse(tmpFile.name);
            assert.deepEqual(pkg, {
                name: 'test',
                version: '0.0.0'
            });
        } finally {
            tmpFile.removeCallback();
        }
    });

    it('should fail when name is missing', async function () {
        const tmpFile = tmp.fileSync();
        const pkgJson = JSON.stringify({
            version: '0.0.0'
        });

        fs.writeSync(tmpFile.fd, pkgJson);

        try {
            await assert.rejects(parse(tmpFile.name), (err) => {
                assert.equal(err.message, '"name" or "version" is missing from theme package.json file.');
                assert.equal(err.context, tmpFile.name);
                assert.equal(err.help, 'This will be required in future. Please see https://ghost.org/docs/themes/');
                return true;
            });
        } finally {
            tmpFile.removeCallback();
        }
    });

    it('should fail when version is missing', async function () {
        const tmpFile = tmp.fileSync();
        const pkgJson = JSON.stringify({
            name: 'test'
        });

        fs.writeSync(tmpFile.fd, pkgJson);

        try {
            await assert.rejects(parse(tmpFile.name), (err) => {
                assert.equal(err.message, '"name" or "version" is missing from theme package.json file.');
                assert.equal(err.context, tmpFile.name);
                assert.equal(err.help, 'This will be required in future. Please see https://ghost.org/docs/themes/');
                return true;
            });
        } finally {
            tmpFile.removeCallback();
        }
    });

    it('should fail when JSON is invalid', async function () {
        const tmpFile = tmp.fileSync();
        const pkgJson = '{name:"test"}';

        fs.writeSync(tmpFile.fd, pkgJson);

        try {
            await assert.rejects(parse(tmpFile.name), (err) => {
                assert.equal(err.message, 'Theme package.json file is malformed');
                assert.equal(err.context, tmpFile.name);
                assert.equal(err.help, 'This will be required in future. Please see https://ghost.org/docs/themes/');
                return true;
            });
        } finally {
            tmpFile.removeCallback();
        }
    });

    it('should fail when file is missing', async function () {
        const tmpFile = tmp.fileSync();

        tmpFile.removeCallback();
        await assert.rejects(parse(tmpFile.name), (err) => {
            assert.equal(err.message, 'Could not read package.json file');
            assert.equal(err.context, tmpFile.name);
            return true;
        });
    });
});
