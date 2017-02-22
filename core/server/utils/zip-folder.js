var archiver = require('archiver'),
    fs = require('fs');

module.exports = function zipFolder(folderToZip, destination, callback) {
    var output = fs.createWriteStream(destination),
        archive = archiver.create('zip', {});

    // CASE: always ask for the real path, because the target folder could be a symlink
    fs.realpath(folderToZip, function (err, realpath) {
        if (err) {
            return callback(err);
        }

        output.on('close', function () {
            callback(null, archive.pointer());
        });

        archive.on('error', function (err) {
            callback(err, null);
        });

        archive.directory(realpath, '/');
        archive.pipe(output);
        archive.finalize();
    });
};

