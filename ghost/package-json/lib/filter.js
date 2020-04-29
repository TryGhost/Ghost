const _ = require('lodash');
const notAPackageRegex = /^\.|_messages|README.md/i;
let filterPackages;

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
filterPackages = function filterPackages(packages, active) {
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
};

module.exports = filterPackages;
