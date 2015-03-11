var moment  = require('moment'),
    path    = require('path');

function StorageBase() {
}

StorageBase.prototype.getTargetDir = function (baseDir) {
    var m = moment(new Date().getTime()),
        month = m.format('MM'),
        year =  m.format('YYYY');

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

    filename = path.join(dir, name + append + ext);

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
    var ext = path.extname(image.name),
        name = path.basename(image.name, ext).replace(/[\W]/gi, '-'),
        self = this;

    return self.generateUnique(store, targetDir, name, ext, 0);
};

module.exports = StorageBase;
