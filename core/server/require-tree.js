var _        = require('lodash'),
    fs       = require('fs'),
    keys     = require('when/keys'),
    path     = require('path'),
    when     = require('when'),
    parsePackageJson = function (path, messages) {
        // Default the messages if non were passed
        messages = messages || {
            errors: [],
            warns: []
        };

        var packageDeferred = when.defer(),
            packagePromise = packageDeferred.promise,
            jsonContainer;

        fs.readFile(path, function (error, data) {
            if (error) {
                messages.errors.push({
                    message: 'Could not read package.json file',
                    context: path
                });
                packageDeferred.resolve(false);
                return;
            }
            try {
                jsonContainer = JSON.parse(data);
                if (jsonContainer.hasOwnProperty('name') && jsonContainer.hasOwnProperty('version')) {
                    packageDeferred.resolve(jsonContainer);
                } else {
                    messages.errors.push({
                        message: '"name" or "version" is missing from theme package.json file.',
                        context: path,
                        help: 'This will be required in future. Please see http://docs.ghost.org/themes/'
                    });
                    packageDeferred.resolve(false);
                }
            } catch (e) {
                messages.errors.push({
                    message: 'Theme package.json file is malformed',
                    context: path,
                    help: 'This will be required in future. Please see http://docs.ghost.org/themes/'
                });
                packageDeferred.resolve(false);
            }
        });
        return when(packagePromise);
    },
    readDir = function (dir, options, depth, messages) {
        depth = depth || 0;
        messages = messages || {
            errors: [],
            warns: []
        };

        options = _.extend({
            index: true
        }, options);

        if (depth > 1) {
            return null;
        }

        var subtree = {},
            treeDeferred = when.defer(),
            treePromise = treeDeferred.promise;

        fs.readdir(dir, function (error, files) {
            if (error) {
                return treeDeferred.reject(error);
            }

            files = files || [];

            files.forEach(function (file) {
                var fileDeferred = when.defer(),
                    filePromise = fileDeferred.promise,
                    fpath = path.join(dir, file);
                subtree[file] = filePromise;
                fs.lstat(fpath, function (error, result) {
                    /*jslint unparam:true*/
                    if (result.isDirectory()) {
                        fileDeferred.resolve(readDir(fpath, options, depth + 1, messages));
                    } else if (depth === 1 && file === 'package.json') {
                        fileDeferred.resolve(parsePackageJson(fpath, messages));
                    } else {
                        fileDeferred.resolve(fpath);
                    }
                });
            });

            return keys.all(subtree).then(function (theFiles) {
                return treeDeferred.resolve(theFiles);
            });
        });

        return when(treePromise).then(function (prom) {
            return prom;
        });
    },
    readAll = function (dir, options, depth) {
        // Start with clean messages, pass down along traversal
        var messages = {
            errors: [],
            warns: []
        };

        return when(readDir(dir, options, depth, messages)).then(function (paths) {
            // for all contents of the dir, I'm interested in the ones that are directories and within /theme/
            if (typeof paths === 'object' && dir.indexOf('theme') !== -1) {
                _.each(paths, function (path, index) {
                    if (typeof path === 'object' && !path.hasOwnProperty('package.json') && index.indexOf('.') !== 0) {
                        messages.warns.push({
                            message: 'Found a theme with no package.json file',
                            context: 'Theme name: ' + index,
                            help: 'This will be required in future. Please see http://docs.ghost.org/themes/'
                        });
                    }
                });
            }
            paths._messages = messages;
            return paths;
        }).otherwise(function () {
            return {'_messages': messages};
        });
    };

module.exports = {
    readAll: readAll,
    readDir: readDir,
    parsePackageJson: parsePackageJson
};