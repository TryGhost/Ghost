// # Local File System Image Storage module
// The (default) module for storing images, using the local file system

var errors = require('../../errorHandling'),
    fs = require('fs-extra'),
    moment = require('moment'),
    nodefn = require('when/node/function'),
    path = require('path'),
    when = require('when');

var localfilesystem;

// TODO: this could be a separate module
function getUniqueFileName(dir, name, ext, i, done) {
    var filename,
        append = '';

    if (i) {
        append = '-' + i;
    }

    filename = path.join(dir, name + append + ext);
    fs.exists(filename, function (exists) {
        if (exists) {
            setImmediate(function () {
                i = i + 1;
                return getUniqueFileName(dir, name, ext, i, done);
            });
        } else {
            return done(filename);
        }
    });
}

// ## Module interface  
localfilesystem = {

    // ### Save
    // Saves the image to storage (the file system)
    // - date is current date in ticks
    // - image is the express image object
    // - returns a promise which ultimately returns the full url to the uploaded image
    'save': function (date, image) {

        // QUESTION is it okay for this module to know about content/images?
        var saved = when.defer(),
            m = moment(date),
            month = m.format('MMM'),
            year =  m.format('YYYY'),
            target_dir = path.join('content/images', year, month),
            ext = path.extname(image.name),
            basename = path.basename(image.name, ext).replace(/[\W]/gi, '_');

        getUniqueFileName(target_dir, basename, ext, null, function (filename) {
            nodefn.call(fs.mkdirs, target_dir).then(function () {
                return nodefn.call(fs.copy, image.path, filename);
            }).then(function () {
                // The src for the image must be in URI format, not a file system path, which in Windows uses \
                // For local file system storage can use relative path so add a slash                        
                var fullUrl = ('/' + filename).replace(new RegExp('\\' + path.sep, 'g'), '/');
                return saved.resolve(fullUrl);
            }).otherwise(function (e) {
                errors.logError(e);
                return saved.reject(e);
            });
        });

        return saved.promise;
    }
};

module.exports = localfilesystem;
