const assert = require('node:assert/strict');

const tmp = require('tmp');
const fs = require('fs-extra');
const parse = require('../../../../../core/server/lib/package-json/parse');

describe('package-json parse', function () {
    it('should parse valid package.json', function (done) {
        let pkgJson;
        let tmpFile;

        tmpFile = tmp.fileSync();
        pkgJson = JSON.stringify({
            name: 'test',
            version: '0.0.0'
        });

        fs.writeSync(tmpFile.fd, pkgJson);

        parse(tmpFile.name)
            .then(function (pkg) {
                assert.deepEqual(pkg, {
                    name: 'test',
                    version: '0.0.0'
                });

                done();
            })
            .catch(done)
            .finally(tmpFile.removeCallback);
    });

    it('should fail when name is missing', function (done) {
        let pkgJson;
        let tmpFile;

        tmpFile = tmp.fileSync();
        pkgJson = JSON.stringify({
            version: '0.0.0'
        });

        fs.writeSync(tmpFile.fd, pkgJson);

        parse(tmpFile.name)
            .then(function () {
                done(new Error('packageJSON.parse succeeded, but should\'ve failed'));
            })
            .catch(function (err) {
                assert.equal(err.message, '"name" or "version" is missing from theme package.json file.');
                assert.equal(err.context, tmpFile.name);
                assert.equal(err.help, 'This will be required in future. Please see https://ghost.org/docs/themes/');

                done();
            })
            .catch(done)
            .finally(tmpFile.removeCallback);
    });

    it('should fail when version is missing', function (done) {
        let pkgJson;
        let tmpFile;

        tmpFile = tmp.fileSync();
        pkgJson = JSON.stringify({
            name: 'test'
        });

        fs.writeSync(tmpFile.fd, pkgJson);

        parse(tmpFile.name)
            .then(function () {
                done(new Error('packageJSON.parse succeeded, but should\'ve failed'));
            })
            .catch(function (err) {
                assert.equal(err.message, '"name" or "version" is missing from theme package.json file.');
                assert.equal(err.context, tmpFile.name);
                assert.equal(err.help, 'This will be required in future. Please see https://ghost.org/docs/themes/');

                done();
            })
            .catch(done)
            .finally(tmpFile.removeCallback);
    });

    it('should fail when JSON is invalid', function (done) {
        let pkgJson;
        let tmpFile;

        tmpFile = tmp.fileSync();
        pkgJson = '{name:"test"}';

        fs.writeSync(tmpFile.fd, pkgJson);

        parse(tmpFile.name)
            .then(function () {
                done(new Error('packageJSON.parse succeeded, but should\'ve failed'));
            })
            .catch(function (err) {
                assert.equal(err.message, 'Theme package.json file is malformed');
                assert.equal(err.context, tmpFile.name);
                assert.equal(err.help, 'This will be required in future. Please see https://ghost.org/docs/themes/');

                done();
            })
            .catch(done)
            .finally(tmpFile.removeCallback);
    });

    it('should fail when file is missing', function (done) {
        const tmpFile = tmp.fileSync();

        tmpFile.removeCallback();
        parse(tmpFile.name)
            .then(function () {
                done(new Error('packageJSON.parse succeeded, but should\'ve failed'));
            })
            .catch(function (err) {
                assert.equal(err.message, 'Could not read package.json file');
                assert.equal(err.context, tmpFile.name);

                done();
            })
            .catch(done);
    });
});
