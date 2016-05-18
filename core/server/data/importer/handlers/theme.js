var _       = require('lodash'),
    Promise = require('bluebird'),
    path    = require('path'),
    config  = require('../../../config'),
    storage = require('../../../storage'),

    ThemeHandler;

ThemeHandler = {
    type: 'theme',
    extensions: config.uploads.extensions.concat(['.hbs', '.css', '.idx', '.json', '.pack', '.sample', '.md', '.eot', '.svg', '.ttf', '.woff']),
    types: config.uploads.contentTypes.concat(['application/octet-stream', 'applicaiton/json', 'text/html']),
    directories: ['themes', 'content'],
    loadFile: function (files, baseDir) {
        var store = storage.getStorage(),
            baseDirRegex = baseDir ? new RegExp('^' + baseDir + '/') : new RegExp(''),
            themeFolderRegexes = _.map(config.paths.themeRelPath.split('/'), function (dir) {
                return new RegExp('^' + dir + '/');
            });

        // normalize the directory structure
        files = _.map(files, function (file) {
            var noBaseDir = file.name.replace(baseDirRegex, ''),
                noGhostDirs = noBaseDir;

            _.each(themeFolderRegexes, function (regex) {
                noGhostDirs = noGhostDirs.replace(regex, '');
            });

            file.originalPath = noBaseDir;
            file.name = noGhostDirs;
            file.targetDir = path.join(config.paths.themePath, path.dirname(noGhostDirs));
            return file;
        });

        return Promise.map(files, function (file) {
            return store.getUniqueFileName(store, file, file.targetDir).then(function (targetFilename) {
                file.newPath = (config.paths.subdir + '/' +
                    config.paths.themeRelPath + '/' + path.relative(config.paths.themePath, targetFilename))
                        .replace(new RegExp('\\' + path.sep, 'g'), '/');
                return file;
            });
        });
    }
};

module.exports = ThemeHandler;
