var moment = require('moment'),
    path = require('path');

function StorageBase() {
    Object.defineProperty(this, 'requiredFns', {
        value: ['exists', 'save', 'serve', 'delete'],
        writable: false
    });
}

StorageBase.prototype.getTargetDir = function (baseDir) {
    var m = moment(),
        month = m.format('MM'),
        year = m.format('YYYY');

    if (baseDir) {
        return path.join(baseDir, year, month);
    }

    return path.join(year, month);
};

StorageBase.prototype.generateUnique = function (store, dir, name, ext, i) {
    var self = this,
        filename,
        append = '';

    if (i) {
        append = '-' + i;
    }

    if (ext) {
        filename = path.join(dir, name + append + ext);
    } else {
        filename = path.join(dir, name + append);
    }

    return store.exists(filename).then(function (exists) {
        if (exists) {
            i = i + 1;
            return self.generateUnique(store, dir, name, ext, i);
        } else {
            return filename;
        }
    });
};

StorageBase.prototype.getUniqueFileName = function (store, image, targetDir) {
    var ext = path.extname(image.name), name;

    // poor extension validation
    // .1 is not a valid extension
    if (!ext.match(/.\d/)) {
        name = this.getSanitizedFileName(path.basename(image.name, ext));
        return this.generateUnique(store, targetDir, name, ext, 0);
    } else {
        name = this.getSanitizedFileName(path.basename(image.name));
        return this.generateUnique(store, targetDir, name, null, 0);
    }
};

StorageBase.prototype.getSanitizedFileName = function getSanitizedFileName(fileName) {
    // below only matches ascii characters, @, and .
    // unicode filenames like город.zip would therefore resolve to ----.zip
    return fileName.replace(/[^\w@.]/gi, '-');
};

module.exports = StorageBase;
