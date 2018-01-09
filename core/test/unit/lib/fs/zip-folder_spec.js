var should = require('should'), // jshint ignore:line
    path = require('path'),
    fs = require('fs-extra'),
    extract = require('extract-zip'),
    fsLib = require('../../../../server/lib/fs');

describe('lib/fs: read csv', function () {
    const symlinkPath = path.join(__dirname, '..', '..', '..', 'utils', 'fixtures', 'themes', 'theme-symlink'),
        folderToSymlink = path.join(__dirname, '..', '..', '..', 'utils', 'fixtures', 'themes', 'casper'),
        zipDestination = path.join(__dirname, '..', '..', '..', 'utils', 'fixtures', 'themes', 'theme-symlink.zip'),
        unzipDestination = path.join(__dirname, '..', '..', '..', 'utils', 'fixtures', 'themes', 'theme-symlink-unzipped');

    before(function () {
        fs.removeSync(symlinkPath);
        fs.removeSync(zipDestination);
        fs.removeSync(unzipDestination);
    });

    after(function () {
        fs.removeSync(symlinkPath);
        fs.removeSync(zipDestination);
        fs.removeSync(unzipDestination);
    });

    it('ensure symlinks work', function (done) {
        fs.symlink(folderToSymlink, symlinkPath);

        fsLib.zipFolder(symlinkPath, zipDestination, function (err) {
            if (err) {
                return done(err);
            }

            extract(zipDestination, {dir: unzipDestination}, function (err) {
                if (err) {
                    return done(err);
                }

                fs.readdir(unzipDestination, function (err, files) {
                    if (err) {
                        return done(err);
                    }

                    files.length.should.eql(13);
                    done();
                });
            });
        });
    });
});
