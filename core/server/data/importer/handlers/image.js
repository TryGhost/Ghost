var _ = require('lodash'),
    Promise = require('bluebird'),
    config = require('../../../config'),
    urlUtils = require('../../../lib/url-utils'),

    ImageHandler;

ImageHandler = {
    type: 'images',
    extensions: config.get('uploads').images.extensions,
    contentTypes: config.get('uploads').images.contentTypes,
    directories: ['images', 'content'],

    loadFile: function (files, baseDir) {
        var baseDirRegex = baseDir ? new RegExp('^' + baseDir + '/') : new RegExp(''),
            imageFolderRegexes = _.map(urlUtils.STATIC_IMAGE_URL_PREFIX.split('/'), function (dir) {
                return new RegExp('^' + dir + '/');
            });

        // normalize the directory structure
        return Promise.map(files, function (file) {
            var noBaseDir = file.name.replace(baseDirRegex, ''),
                noGhostDirs = noBaseDir;

            _.each(imageFolderRegexes, function (regex) {
                noGhostDirs = noGhostDirs.replace(regex, '');
            });

            file.originalPath = noBaseDir;
            file.name = noGhostDirs;
            return file;
        });
    }
};

module.exports = ImageHandler;
