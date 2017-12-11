/**
 * Dependencies
 */
var Promise = require('bluebird'),
    _ = require('lodash'),
    join = require('path').join,
    fs = require('fs'),
    parsePackageJson = require('./parse-package-json'),
    common = require('../../lib/common'),

    notAPackageRegex = /^\.|_messages|README.md|node_modules|bower_components/i,
    packageJSONPath = 'package.json',

    statFile = Promise.promisify(fs.stat),
    readDir = Promise.promisify(fs.readdir),

    readPackage,
    readPackages,
    processPackage;

/**
 * Recursively read directory and find the packages in it
 */
processPackage = function processPackage(absolutePath, packageName) {
    var pkg = {
        name: packageName,
        path: absolutePath
    };
    return parsePackageJson(join(absolutePath, packageJSONPath))
        .then(function gotPackageJSON(packageJSON) {
            pkg['package.json'] = packageJSON;
            return pkg;
        })
        .catch(function noPackageJSON() {
            // ignore invalid package.json for now,
            // because Ghost does not rely/use them at the moment
            // in the future, this .catch() will need to be removed,
            // so that error is thrown on invalid json syntax
            pkg['package.json'] = null;
            return pkg;
        });
};

readPackage = function readPackage(packagePath, packageName) {
    var absolutePath = join(packagePath, packageName);
    return statFile(absolutePath)
        .then(function (stat) {
            if (!stat.isDirectory()) {
                return {};
            }

            return processPackage(absolutePath, packageName)
                .then(function gotPackage(pkg) {
                    var res = {};
                    res[packageName] = pkg;
                    return res;
                });
        })
        .catch(function (err) {
            return Promise.reject(new common.errors.NotFoundError({
                message: 'Package not found',
                err: err,
                help: 'path: ' + packagePath,
                context: 'name: ' + packageName
            }));
        });
};

readPackages = function readPackages(packagePath) {
    return readDir(packagePath)
        .filter(function (packageName) {
            // Filter out things which are not packages by regex
            if (packageName.match(notAPackageRegex)) {
                return;
            }
            // Check the remaining items to ensure they are a directory
            return statFile(join(packagePath, packageName)).then(function (stat) {
                return stat.isDirectory();
            });
        })
        .map(function readPackageJson(packageName) {
            var absolutePath = join(packagePath, packageName);
            return processPackage(absolutePath, packageName);
        })
        .then(function (packages) {
            return _.keyBy(packages, 'name');
        });
};

/**
 * Expose Public API
 */
module.exports.all = readPackages;
module.exports.one = readPackage;
