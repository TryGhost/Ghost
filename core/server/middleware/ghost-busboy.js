var BusBoy  = require('busboy'),
    fs      = require('fs-extra'),
    path    = require('path'),
    os      = require('os'),
    crypto  = require('crypto');

// ### ghostBusboy
// Process multipart file streams
function ghostBusBoy(req, res, next) {
    var busboy,
        stream,
        tmpDir;

    // busboy is only used for POST requests
    if (req.method && !/post/i.test(req.method)) {
        return next();
    }

    busboy = new BusBoy({headers: req.headers});
    tmpDir = os.tmpdir();

    req.files = req.files || {};
    req.body = req.body || {};

    busboy.on('file', function onFile(fieldname, file, filename, encoding, mimetype) {
        var filePath,
            tmpFileName,
            md5 = crypto.createHash('md5');

        // If the filename is invalid, skip the stream
        if (!filename) {
            return file.resume();
        }

        // Create an MD5 hash of original filename
        md5.update(filename, 'utf8');

        tmpFileName = (new Date()).getTime() + md5.digest('hex');

        filePath = path.join(tmpDir, tmpFileName || 'temp.tmp');

        file.on('end', function end() {
            req.files[fieldname] = {
                type: mimetype,
                encoding: encoding,
                name: filename,
                path: filePath
            };
        });

        file.on('error', function onError(error) {
            console.log('Error', 'Something went wrong uploading the file', error);
        });

        stream = fs.createWriteStream(filePath);

        stream.on('error', function onError(error) {
            console.log('Error', 'Something went wrong uploading the file', error);
        });

        file.pipe(stream);
    });

    busboy.on('error', function onError(error) {
        console.log('Error', 'Something went wrong parsing the form', error);
        res.status(500).send({code: 500, message: 'Could not parse upload completely.'});
    });

    busboy.on('field', function onField(fieldname, val) {
        req.body[fieldname] = val;
    });

    busboy.on('finish', function onFinish() {
        next();
    });

    req.pipe(busboy);
}

module.exports = ghostBusBoy;
