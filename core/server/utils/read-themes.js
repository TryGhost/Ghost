/**
 * Dependencies
 */

var readDirectory = require('./read-directory'),
    Promise = require('bluebird'),
    join = require('path').join,
    fs = require('fs'),

    statFile = Promise.promisify(fs.stat);

/**
 * Read themes
 */

function readThemes(dir) {
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
}

/**
 * Expose `read-themes`
 */

module.exports = readThemes;
