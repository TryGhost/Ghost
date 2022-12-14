require('./utils');

const tmp = require('tmp');
const fs = require('fs-extra');
const parse = require('../lib/parse');

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
                pkg.should.eql({
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
                err.message.should.equal('"name" or "version" is missing from theme package.json file.');
                err.context.should.equal(tmpFile.name);
                err.help.should.equal('This will be required in future. Please see https://ghost.org/docs/themes/');

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
                err.message.should.equal('"name" or "version" is missing from theme package.json file.');
                err.context.should.equal(tmpFile.name);
                err.help.should.equal('This will be required in future. Please see https://ghost.org/docs/themes/');

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
                err.message.should.equal('Theme package.json file is malformed');
                err.context.should.equal(tmpFile.name);
                err.help.should.equal('This will be required in future. Please see https://ghost.org/docs/themes/');

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
                err.message.should.equal('Could not read package.json file');
                err.context.should.equal(tmpFile.name);

                done();
            })
            .catch(done);
    });
});
