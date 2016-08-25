var archiver = require('archiver'),
    fs = require('fs');

module.exports = function zipFolder(folderToZip, destination, callback) {
    var output = fs.createWriteStream(destination),
        archive = archiver.create('zip', {});

    output.on('close', function () {
        callback(null, archive.pointer());
    });

    archive.on('error', function (err) {
        callback(err, null);
    });

    archive.directory(folderToZip, '/');
    archive.pipe(output);
    archive.finalize();
};

