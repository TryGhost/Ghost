var _        = require('lodash'),
    fs       = require('fs'),
    path     = require('path'),
    Promise  = require('bluebird'),
    readdirAsync  = Promise.promisify(fs.readdir),
    lstatAsync    = Promise.promisify(fs.lstat),
    readlinkAsync = Promise.promisify(fs.readlink),

    parsePackageJson = function (path, messages) {
        // Default the messages if non were passed
        messages = messages || {
            errors: [],
            warns: []
        };

        var jsonContainer;

        return new Promise(function (resolve) {
            fs.readFile(path, function (error, data) {
                if (error) {
                    messages.errors.push({
                        message: 'Could not read package.json file',
                        context: path
                    });
                    resolve(false);
                    return;
                }
                try {
                    jsonContainer = JSON.parse(data);
                    if (jsonContainer.hasOwnProperty('name') && jsonContainer.hasOwnProperty('version')) {
                        resolve(jsonContainer);
                    } else {
                        messages.errors.push({
                            message: '"name" or "version" is missing from theme package.json file.',
                            context: path,
                            help: 'This will be required in future. Please see http://docs.ghost.org/themes/'
                        });
                        resolve(false);
                    }
                } catch (e) {
                    messages.errors.push({
                        message: 'Theme package.json file is malformed',
                        context: path,
                        help: 'This will be required in future. Please see http://docs.ghost.org/themes/'
                    });
                    resolve(false);
                }
            });
        });
    },

    readDir = function (dir, options, depth, messages) {
        depth = depth || 0;
        messages = messages || {
            errors: [],
            warns: []
        };

        options = _.extend({
            index: true,
            followSymlinks: true
        }, options);

        if (depth > 1) {
            return Promise.resolve(null);
        }

        return readdirAsync(dir).then(function (files) {
            files = files || [];

            return Promise.reduce(files, function (results, file) {
                var fpath = path.join(dir, file);

                return lstatAsync(fpath).then(function (result) {
                    if (result.isDirectory()) {
                        return readDir(fpath, options, depth + 1, messages);
                    } else if (options.followSymlinks && result.isSymbolicLink()) {
                        return readlinkAsync(fpath).then(function (linkPath) {
                            linkPath = path.resolve(dir, linkPath);

                            return lstatAsync(linkPath).then(function (result) {
                                if (result.isFile()) {
                                    return linkPath;
                                }

                                return readDir(linkPath, options, depth + 1, messages);
                            });
                        });
                    } else if (depth === 1 && file === 'package.json') {
                        return parsePackageJson(fpath, messages);
                    } else {
                        return fpath;
                    }
                }).then(function (result) {
                    results[file] = result;

                    return results;
                });
            }, {});
        });
    },
    readAll = function (dir, options, depth) {
        // Start with clean messages, pass down along traversal
        var messages = {
            errors: [],
            warns: []
        };

        return readDir(dir, options, depth, messages).then(function (paths) {
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
        }).catch(function () {
            return {_messages: messages};
        });
    };

module.exports = {
    readAll: readAll,
    readDir: readDir,
    parsePackageJson: parsePackageJson
};
