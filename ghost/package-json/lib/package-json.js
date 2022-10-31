/*
 * # Package Utils
 *
 * Ghost has support for several different types of sub-packages:
 * - Themes: have always been packages, but we're going to lean more heavily on npm & package.json in future
 * - Adapters: replace fundamental pieces like storage, will become npm modules
 *
 * These utils facilitate loading, reading, managing etc, packages from the file system.
 *
 */
const _ = require('lodash');
const fs = require('fs-extra');
const join = require('path').join;
const errors = require('@tryghost/errors');
const parse = require('./parse');

const notAPackageRegex = /^\.|_messages|README.md|node_modules|bower_components/i;
const packageJSONPath = 'package.json';

/**
 * @typedef {object} PackageList
 * @typedef {object} Package
 */

/**
 * Recursively read directory and find the packages in it
 *
 * @param {string} absolutePath
 * @param {string} packageName
 * @returns {Promise<Package>}
 */
async function processPackage(absolutePath, packageName) {
    const pkg = {
        name: packageName,
        path: absolutePath
    };

    try {
        const packageJSON = await parse(join(absolutePath, packageJSONPath));
        pkg['package.json'] = packageJSON;
    } catch (err) {
        // ignore invalid package.json for now,
        // because Ghost does not rely/use them at the moment
        // in the future, this .catch() will need to be removed,
        // so that error is thrown on invalid json syntax
        pkg['package.json'] = null;
    }

    return pkg;
}

/**
 * ### Filter Packages
 * Normalizes packages read by readPackages so that the themes module can use them.
 * Iterates over each package and return an array of objects which are simplified representations of the package
 * with 3 properties:
 *
 * @typedef {object} SimplePackage
 * @prop {string} name    - the package name
 * @prop {object|boolean} package - contents of the package.json or false if there isn't one
 * @prop {boolean} active  - set to true if this package is active
 *
 * This data structure is used for listings of packages provided over the API and as such
 * deliberately combines multiple sources of information in order to be efficient.
 *
 * TODO: simplify the package.json representation to contain only fields we use
 *
 * @param   {PackageList}       packages    object made up of packages keyed by name as returned by readPackages
 * @param   {array|string}      [active]    optional set of names of packages that are active
 * @returns {Array<SimplePackage>}          array of objects with useful info about themes
 */
function filter(packages, active) {
    // turn active into an array if it isn't one, so this function can deal with lists and one-offs
    if (!Array.isArray(active)) {
        active = [active];
    }

    return _.reduce(packages, function (result, pkg, key) {
        let item = {};
        if (!key.match(notAPackageRegex)) {
            item = {
                name: key,
                package: pkg['package.json'] || false,
                active: _.indexOf(active, key) !== -1
            };

            result.push(item);
        }

        return result;
    }, []);
}

/**
 * @param {string} packagePath
 * @param {string} packageName
 * @returns {Promise<Package>}
 */
async function readPackage(packagePath, packageName) {
    const absolutePath = join(packagePath, packageName);

    try {
        const stat = await fs.stat(absolutePath);
        if (!stat.isDirectory()) {
            return {};
        }

        const pkg = await processPackage(absolutePath, packageName);
        const res = {};
        res[packageName] = pkg;
        return res;
    } catch (err) {
        return Promise.reject(new errors.NotFoundError({
            message: 'Package not found',
            err: err,
            help: 'path: ' + packagePath,
            context: 'name: ' + packageName
        }));
    }
}

/**
 * @param {string} packagePath
 * @returns {Promise<PackageList>}
 */
async function readPackages(packagePath) {
    const files = await fs.promises.readdir(packagePath, {withFileTypes: true});
    const packages = await Promise.all(files.map(async (file) => {
        // Filter out things which are not packages by regex
        if (file.name.match(notAPackageRegex)) {
            return false;
        }

        if (file.isSymbolicLink()) {
            const packageFileOrig = await fs.stat(join(packagePath, file.name));
            return packageFileOrig.isDirectory();
        }

        // Check the remaining items to ensure they are a directory
        return file.isDirectory();
    }))
        .then(results => files.filter((_v, index) => results[index]))
        .then(packageFiles => Promise.all(packageFiles.map((packageFile) => {
            const absolutePath = join(packagePath, packageFile.name);
            return processPackage(absolutePath, packageFile.name);
        })));
    
    return _.keyBy(packages, 'name');
}

module.exports = {
    filter,
    readPackage,
    readPackages
};
