var _       = require('lodash'),
    Promise = require('bluebird'),
    path    = require('path'),
    config  = require('../../../config'),
    storage = require('../../../storage'),

    ImageHandler;

ImageHandler = {
    type: 'images',
    extensions: config.uploads.images.extensions,
    contentTypes: config.uploads.images.contentTypes,
    directories: ['images', 'content'],

    loadFile: function (files, baseDir) {
        var store = storage.getStorage(),
            baseDirRegex = baseDir ? new RegExp('^' + baseDir + '/') : new RegExp(''),
            imageFolderRegexes = _.map(config.paths.imagesRelPath.split('/'), function (dir) {
                return new RegExp('^' + dir + '/');
            });

        // normalize the directory structure
        files = _.map(files, function (file) {
            var noBaseDir = file.name.replace(baseDirRegex, ''),
                noGhostDirs = noBaseDir;

            _.each(imageFolderRegexes, function (regex) {
                noGhostDirs = noGhostDirs.replace(regex, '');
            });

            file.originalPath = noBaseDir;
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
