// Switch these lines once there are useful utils
// const testUtils = require('./utils');
require('./utils');

const path = require('path');
const fs = require('fs-extra');

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
        fs.symlink(folderToSymlink, symlinkPath);

        compress(symlinkPath, zipDestination)
            .then((res) => {
                res.should.be.an.Object().with.properties('path', 'size');
                res.path.should.eql(zipDestination);
                res.size.should.eql(321775);

                extract(zipDestination, unzipDestination)
                    .then((res) => {
                        res.should.be.an.Object().with.properties('path');
                        res.path.should.eql(unzipDestination);

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
