var tmp         = require('tmp'),
    should      = require('should'),
    Promise     = require('bluebird'),
    configUtils = require('../../utils/configUtils'),
    extname     = require('path').extname,

    // Stuff we are testing
    UploadAPI   = require('../../../server/api/upload'),
    uploadimage = {
        originalname: '',
        mimetype: '',
        path: ''
    };

function setupAndTestUpload(filename, mimeType) {
    return new Promise(function (resolve, reject) {
        // create a temp file (the uploaded file)
        tmp.file({keep: true}, function (err, path/*, fd, cleanupFile*/) {
            if (err) {
                return reject(err);
            }

            uploadimage.path = path;
            uploadimage.originalname = filename;
            uploadimage.mimetype = mimeType;

            // create a temp directory (the directory that the API saves the file to)
            tmp.dir({keep: true, unsafeCleanup: true}, function (err, path, cleanupDir) {
                if (err) {
                    return reject(err);
                }

                configUtils.set({
                    paths: {
                        contentPath: path
                    }
                });

                UploadAPI.add(uploadimage)
                .then(resolve)
                .catch(reject)
                .finally(function () {
                    // remove the temporary directory (file is unlinked by the API)
                    cleanupDir();
                });
            });
        });
    });
}

function testResult(filename, result) {
    var base = filename,
        ext = extname(base),
        regex;

    if (ext) {
        base = base.split(ext)[0];
    }

    regex = new RegExp('^/content/images/[0-9]{4}/[0-9]{2}/' + base + '.*' + ext + '$');
    regex.test(result).should.be.true();
}

describe('Upload API', function () {
    afterEach(function () {
        uploadimage  = {
            originalname: '',
            mimetype: 'application/octet-stream',
            path: ''
        };

        configUtils.restore();
    });

    should.exist(UploadAPI);

    describe('invalid file extension and mime-type', function () {
        it('should return 415 for invalid file extension', function (done) {
            setupAndTestUpload('test.invalid', 'application/octet-stream').then(function () {
                done(new Error('Upload succeeded with invalid extension and mime-type'));
            }).catch(function (err) {
                should.exist(err);
                err.statusCode.should.equal(415);
                err.errorType.should.equal('UnsupportedMediaTypeError');

                done();
            }).catch(done);
        });
    });

    describe('valid extension but invalid type', function () {
        it('should return 415 for mime-type', function (done) {
            setupAndTestUpload('test.jpg', 'application/octet-stream').then(function () {
                done(new Error('Upload succeeded with invalid mime-type'));
            }).catch(function (err) {
                should.exist(err);
                err.statusCode.should.equal(415);
                err.errorType.should.equal('UnsupportedMediaTypeError');

                done();
            }).catch(done);
        });
    });

    describe('valid file', function () {
        it('can upload jpg', function (done) {
            var filename = 'test.jpg';

            setupAndTestUpload(filename, 'image/jpeg').then(function (url) {
                testResult(filename, url);

                done();
            }).catch(done);
        });

        it('cannot upload jpg with incorrect extension', function (done) {
            setupAndTestUpload('invalid.xjpg', 'image/jpeg').then(function () {
                done(new Error('Upload succeeded with invalid extension'));
            }).catch(function (err) {
                should.exist(err);
                err.statusCode.should.equal(415);
                err.errorType.should.equal('UnsupportedMediaTypeError');

                done();
            }).catch(done);
        });

        it('can upload png', function (done) {
            var filename = 'test.png';

            setupAndTestUpload(filename, 'image/png').then(function (url) {
                testResult(filename, url);

                done();
            }).catch(done);
        });

        it('can upload gif', function (done) {
            var filename = 'test.gif';

            setupAndTestUpload(filename, 'image/gif').then(function (url) {
                testResult(filename, url);

                done();
            }).catch(done);
        });
    });

    describe('missing file', function () {
        it('throws an error if no file is provided', function (done) {
            UploadAPI.add({}).then(function () {
                done(new Error('Upload succeeded with invalid extension'));
            }).catch(function (err) {
                should.exist(err);
                err.statusCode.should.equal(403);
                err.errorType.should.equal('NoPermissionError');

                done();
            }).catch(done);
        });
    });
});
