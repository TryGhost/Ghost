/**
 * Dependencies
 */

var readDirectory = require('../utils').readDirectory,
    Promise = require('bluebird'),
    _ = require('lodash'),
    join = require('path').join,
    fs = require('fs'),

    statFile = Promise.promisify(fs.stat),
    readOneTheme,
    readAllThemes;

readOneTheme = function readOneTheme(dir, name) {
    var toRead = join(dir, name),
        themes = {};

    return readDirectory(toRead)
        .then(function (tree) {
            if (!_.isEmpty(tree)) {
                themes[name] = tree;
            }

            return themes;
        });
};

readAllThemes = function readAllThemes(dir) {
    var originalTree;

    return readDirectory(dir)
        .tap(function (tree) {
            originalTree = tree;
        })
        .then(Object.keys)
        .filter(function (file) {
            var path = join(dir, file);

            return statFile(path).then(function (stat) {
                return stat.isDirectory();
            });
        })
        .then(function (directories) {
            var themes = {};

            directories.forEach(function (name) {
                themes[name] = originalTree[name];
            });

            return themes;
        });
};

/**
 * Expose public API
 */

module.exports.all = readAllThemes;
module.exports.one = readOneTheme;
