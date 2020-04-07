// Switch these lines once there are useful utils
// const testUtils = require('./utils');
require('./utils');

const path = require('path');
const fs = require('fs-extra');

// Mimic how we expect this to be required
const {zipFolder, extract} = require('../');

describe('lib/fs: read csv', function () {
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
        fs.symlink(folderToSymlink, symlinkPath);

        zipFolder(symlinkPath, zipDestination)
            .then(() => {
                extract(zipDestination, {dir: unzipDestination})
                    .then(() => {
                        fs.readdir(unzipDestination, function (err, files) {
                            if (err) {
                                return done(err);
                            }

                            files.length.should.eql(16);
                            done();
                        });
                    })
                    .catch((err) => {
                        return done(err);
                    });
            })
            .catch((err) => {
                return done(err);
            });
    });
});
