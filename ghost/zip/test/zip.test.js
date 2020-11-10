// Switch these lines once there are useful utils
// const testUtils = require('./utils');
require('./utils');

const path = require('path');
const fs = require('fs-extra');
const {hashElement} = require('folder-hash');

// Mimic how we expect this to be required
const {compress, extract} = require('../');

describe('Compress and Extract should be opposite functions', function () {
    let symlinkPath, folderToSymlink, zipDestination, unzipDestination;

    const cleanUp = () => {
        fs.removeSync(symlinkPath);
        fs.removeSync(zipDestination);
        fs.removeSync(unzipDestination);
    };

    before(function () {
        symlinkPath = path.join(__dirname, 'fixtures', 'theme-symlink');
        folderToSymlink = path.join(__dirname, 'fixtures', 'test-theme');
        zipDestination = path.join(__dirname, 'fixtures', 'theme-symlink.zip');
        unzipDestination = path.join(__dirname, 'fixtures', 'theme-symlink-unzipped');

        cleanUp();
    });

    after(function () {
        cleanUp();
    });

    it('ensure symlinks work', function (done) {
        fs.symlinkSync(folderToSymlink, symlinkPath);

        let originalHash;

        hashElement(symlinkPath)
            .then((_originalHash) => {
                originalHash = _originalHash;
                return compress(symlinkPath, zipDestination);
            })
            .then((res) => {
                res.should.be.an.Object().with.properties('path', 'size');
                res.path.should.eql(zipDestination);
                res.size.should.be.below(619618);

                return extract(zipDestination, unzipDestination);
            })
            .then((res) => {
                res.should.be.an.Object().with.properties('path');
                res.path.should.eql(unzipDestination);

                return hashElement(unzipDestination);
            })
            .then((extractedHash) => {
                originalHash.children.toString().should.eql(extractedHash.children.toString());

                done();
            })
            .catch((err) => {
                return done(err);
            });
    });
});
