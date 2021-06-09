const _ = require('lodash');
const Promise = require('bluebird');
const fs = require('fs-extra');
const join = require('path').join;
const errors = require('@tryghost/errors');
const tpl = require('@tryghost/tpl');

const notAPackageRegex = /^\.|_messages|README.md|node_modules|bower_components/i;
const packageJSONPath = 'package.json';

const messages = {
    couldNotReadPackage: 'Could not read package.json file',
    nameOrVersionMissing: '"name" or "version" is missing from theme package.json file.',
    willBeRequired: 'This will be required in future. Please see {url}',
    themeFileIsMalformed: 'Theme package.json file is malformed'
};

/**
 * # Package Utils
 *
 * Ghost has / is in the process of gaining support for several different types of sub-packages:
 * - Themes: have always been packages, but we're going to lean more heavily on npm & package.json in future
 * - Adapters: replace fundamental pieces like storage, will become npm modules
 *
 * These utils facilitate loading, reading, managing etc, packages from the file system.
 *
 */
module.exports = class PackageJson {
    /**
     * ### Filter Packages
     * Normalizes packages read by read-packages so that the themes module can use them.
     * Iterates over each package and return an array of objects which are simplified representations of the package
     * with 3 properties:
     * - `name`    - the package name
     * - `package` - contents of the package.json or false if there isn't one
     * - `active`  - set to true if this package is active
     * This data structure is used for listings of packages provided over the API and as such
     * deliberately combines multiple sources of information in order to be efficient.
     *
     * TODO: simplify the package.json representation to contain only fields we use
     *
     * @param   {object}            packages    as returned by read-packages
     * @param   {array/string}      active      as read from the settings object
     * @returns {Array}                         of objects with useful info about themes
     */
    filter(packages, active) {
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
     * Parse package.json and validate it has
     * all the required fields
     *
     * @param {string} path
     */
    async parse(path) {
        let source;
        let json;

        try {
            source = await fs.readFile(path);
        } catch (readError) {
            const err = new errors.IncorrectUsageError();
            err.message = tpl(messages.couldNotReadPackage);
            err.context = path;
            err.err = readError;

            return Promise.reject(err);
        }

        try {
            json = JSON.parse(source);
        } catch (parseError) {
            const err = new errors.IncorrectUsageError();
            err.message = tpl(messages.themeFileIsMalformed);
            err.context = path;
            err.err = parseError;
            err.help = tpl(messages.willBeRequired, {url: 'https://ghost.org/docs/themes/'});

            return Promise.reject(err);
        }

        const hasRequiredKeys = json.name && json.version;

        if (!hasRequiredKeys) {
            const err = new errors.IncorrectUsageError();
            err.message = tpl(messages.nameOrVersionMissing);
            err.context = path;
            err.help = tpl(messages.willBeRequired, {url: 'https://ghost.org/docs/themes/'});

            return Promise.reject(err);
        }

        return json;
    }

    /**
     * Recursively read directory and find the packages in it
     *
     * @param {string} absolutePath
     * @param {string} packageName
     * @returns {object}
     */
    async processPackage(absolutePath, packageName) {
        const pkg = {
            name: packageName,
            path: absolutePath
        };

        try {
            const packageJSON = await this.parse(join(absolutePath, packageJSONPath));
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
     * @param {string} packagePath
     * @param {string} packageName
     */
    async readPackage(packagePath, packageName) {
        const absolutePath = join(packagePath, packageName);

        try {
            const stat = await fs.stat(absolutePath);
            if (!stat.isDirectory()) {
                return {};
            }

            const pkg = await this.processPackage(absolutePath, packageName);
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
     */
    readPackages(packagePath) {
        const self = this;

        return Promise.resolve(fs.readdir(packagePath))
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
                return self.processPackage(absolutePath, packageName);
            })
            .then(function (packages) {
                return _.keyBy(packages, 'name');
            });
    }
};
