var _       = require('lodash'),
    Promise = require('bluebird'),
    path    = require('path'),
    config  = require('../../../config'),
    storage = require('../../../storage'),
    uploads = config.get('uploads'),
    ImageHandler;

ImageHandler = {
    type: 'images',
    extensions: uploads.extensions,
    types: uploads.contentTypes,
    directories: ['images', 'content'],

    loadFile: function (files, baseDir) {
        var store = storage.getStorage(),
            paths = config.get('paths'),
            baseDirRegex = baseDir ? new RegExp('^' + baseDir + '/') : new RegExp(''),
            imageFolderRegexes = _.map(paths.imagesRelPath.split('/'), function (dir) {
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
            file.targetDir = path.join(paths.contentPath, 'images', path.dirname(noGhostDirs));
            return file;
        });

        return Promise.map(files, function (image) {
            return store.getUniqueFileName(store, image, image.targetDir).then(function (targetFilename) {
                image.newPath = (paths.subdir + '/' +
                    paths.imagesRelPath + '/' + path.relative(path.resolve(paths.contentPath, 'images'), targetFilename))
                        .replace(new RegExp('\\' + path.sep, 'g'), '/');
                return image;
            });
        });
    }
};

module.exports = ImageHandler;
