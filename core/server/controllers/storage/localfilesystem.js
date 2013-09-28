var fs = require('fs-extra'),
    moment = require('moment'),
    nodefn = require('when/node/function'),
    path = require('path');

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

localfilesystem = {
    // TODO use promises!!
    // QUESTION pass date or month and year? And should the date be ticks or an object? Gone with ticks.
    // QUESTION feels wrong to pass in the ghostUrl, the local file system needs it but something like S3 won't?
    // ** date is current date in ticks
    // ** save returns a full url to the uploaded image
    // ** image is the express image object
    'save': function(date, image, ghostUrl, done) {

        // QUESTION is it okay for this module to know about content images?
        var m = new moment(date),
            month = m.format('MMM'),
            year =  m.format('YYYY'),
            target_dir = path.join('content/images', year, month),
            target_path = path.join(target_dir, image.name),
            ext = path.extname(image.name),
            basename = path.basename(image.name, ext).replace(/[\W]/gi, '_');

        getUniqueFileName(target_dir, basename, ext, null, function(filename) {
            
            fs.mkdirs(target_dir, function (err) {
                if (err) {
                    return errors.logError(err);
                }

                fs.copy(image.path, target_path, function (err) {
                    if (err) {
                        return errors.logError(err);
                    }
            
                    // NOTE as every upload will need to delete the tmp file make this the admin controllers job
                    return done(null, path.join(ghostUrl, filename));
                });
            });
        });
    }
};

module.exports = localfilesystem;