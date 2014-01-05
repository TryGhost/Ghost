var BusBoy  = require('busboy'),
    fs      = require('fs-extra'),
    path    = require('path'),
    os      = require('os'),
    crypto  = require('crypto');

// ### ghostBusboy
// Process multipart file streams and copies them to a memory stream to be 
// processed later.
function ghostBusBoy(req, res, next) {
    var busboy,
        tmpDir,
        hasError = false;

    // busboy is only used for POST requests
    if (req.method && !req.method.match(/post/i)) {
        return next();
    }

    busboy = new BusBoy({ headers: req.headers });
    tmpDir = os.tmpdir();

    req.files = req.files || {};
    req.body = req.body || {};

    busboy.on('file', function (fieldname, file, filename, encoding, mimetype) {
        var filePath,
            tmpFileName,
            md5 = crypto.createHash('md5');

        // If the filename is invalid, mark an error
        if (!filename) {
            hasError = true;
        }
        // If we've flagged any errors, do not process any streams
        if (hasError) {
            return file.emit('end');
        }

        // Create an MD5 hash of original filenae
        md5.update(filename, 'utf8');

        tmpFileName = +new Date() + md5.digest('base64');

        filePath = path.join(tmpDir, tmpFileName || 'temp.tmp');

        file.on('end', function () {
            req.files[fieldname] = {
                type: mimetype,
                encoding: encoding,
                name: filename,
                path: filePath
            };
        });

        busboy.on('limit', function () {
            hasError = true;
            res.send(413, { errorCode: 413, message: 'File size limit breached.' });
        });

        file.pipe(fs.createWriteStream(filePath));
    });

    busboy.on('field', function (fieldname, val) {
        req.body[fieldname] = val;
    });

    busboy.on('end', function () {
        next();
    });

    req.pipe(busboy);
}

module.exports = ghostBusBoy;