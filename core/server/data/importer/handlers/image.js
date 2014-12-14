var _       = require('lodash'),
    Promise = require('bluebird'),
    path    = require('path'),
    config  = require('../../../config'),
    storage = require('../../../storage'),

    ImageHandler;

ImageHandler = {
    type: 'images',
    extensions: config.uploads.extensions,
    types: config.uploads.contentTypes,

    loadFile: function (files, startDir) {
        var store = storage.getStorage(),
            startDirRegex = startDir ? new RegExp('^' + startDir + '/') : new RegExp(''),
            imageFolderRegexes = _.map(config.paths.imagesRelPath.split('/'), function (dir) {
                return new RegExp('^' + dir + '/');
            });

        // normalize the directory structure
        files = _.map(files, function (file) {
            var noStartDir = file.name.replace(startDirRegex, ''),
                noGhostDirs = noStartDir;

            _.each(imageFolderRegexes, function (regex) {
                noGhostDirs = noGhostDirs.replace(regex, '');
            });

            file.originalPath = noStartDir;
            file.name = noGhostDirs;
            file.targetDir = path.join(config.paths.imagesPath, path.dirname(noGhostDirs));
            return file;
        });

        return Promise.map(files, function (image) {
            return store.getUniqueFileName(store, image, image.targetDir).then(function (targetFilename) {
                image.newPath = (config.paths.subdir + '/' +
                    config.paths.imagesRelPath + '/' + path.relative(config.paths.imagesPath, targetFilename))
                        .replace(new RegExp('\\' + path.sep, 'g'), '/');
                return image;
            });
        });
    }
};

module.exports = ImageHandler;
