var _ = require('lodash'),
    notAPackageRegex = /^\.|_messages|README.md/i,
    filterPackages;

/**
 * ### Filter Packages
 * Normalizes paths read by read-packages so that the apps and themes modules can use them.
 * Iterates over each package and return an array of objects which are simplified representations of the package
 * with 3 properties:
 * package name as `name`, the package.json as `package` and an active field set to true if this package is active
 *
 * @param   {object}            packages    as returned by read-packages
 * @param   {array/string}      active      as read from the settings object
 * @returns {Array}                         of objects with useful info about apps / themes
 */
filterPackages = function filterPackages(packages, active) {
    // turn active into an array (so themes and apps can be checked the same)
    if (!Array.isArray(active)) {
        active = [active];
    }

    return _.reduce(packages, function (result, pkg, key) {
        var item = {};
        if (!key.match(notAPackageRegex)) {
            item = {
                name: key,
                package: pkg['package.json'] || false
            };

            // At the moment we only support themes. This property is used in Ghost-Admin LTS
            // It is not used in Ghost-Admin 1.0, and therefore this can be removed.
            if (_.indexOf(active, key) !== -1) {
                item.active = true;
            }

            result.push(item);
        }

        return result;
    }, []);
};

module.exports = filterPackages;
