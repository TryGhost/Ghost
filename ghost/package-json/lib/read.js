/**
 * Dependencies
 */
const Promise = require('bluebird');

const _ = require('lodash');
const join = require('path').join;
const fs = require('fs-extra');
const parsePackageJson = require('./parse');
const errors = require('@tryghost/errors');
const notAPackageRegex = /^\.|_messages|README.md|node_modules|bower_components/i;
const packageJSONPath = 'package.json';
let readPackage;
let readPackages;
let processPackage;

/**
 * Recursively read directory and find the packages in it
 */
processPackage = function processPackage(absolutePath, packageName) {
    const pkg = {
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
    const absolutePath = join(packagePath, packageName);
    return fs.stat(absolutePath)
        .then(function (stat) {
            if (!stat.isDirectory()) {
                return {};
            }

            return processPackage(absolutePath, packageName)
                .then(function gotPackage(pkg) {
                    const res = {};
                    res[packageName] = pkg;
                    return res;
                });
        })
        .catch(function (err) {
            return Promise.reject(new errors.NotFoundError({
                message: 'Package not found',
                err: err,
                help: 'path: ' + packagePath,
                context: 'name: ' + packageName
            }));
        });
};

readPackages = function readPackages(packagePath) {
    return fs.readdir(packagePath)
        .filter(function (packageName) {
            // Filter out things which are not packages by regex
            if (packageName.match(notAPackageRegex)) {
                return;
            }
            // Check the remaining items to ensure they are a directory
            return fs.stat(join(packagePath, packageName)).then(function (stat) {
                return stat.isDirectory();
            });
        })
        .map(function readPackageJson(packageName) {
            const absolutePath = join(packagePath, packageName);
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
