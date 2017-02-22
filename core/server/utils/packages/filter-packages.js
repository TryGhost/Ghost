var _ = require('lodash'),
    filterPackages;

/**
 * ### Filter Paths
 * Normalizes paths read by require-tree so that the apps and themes modules can use them. Creates an empty
 * array (res), and populates it with useful info about the read packages like name, whether they're active
 * (comparison with the second argument), and if they have a package.json, that, otherwise false
 * @private
 * @param   {object}            packages       as returned by read-packages
 * @param   {array/string}      active      as read from the settings object
 * @returns {Array}                         of objects with useful info about apps / themes
 */
filterPackages = function filterPackages(packages, active) {
    var pathKeys = Object.keys(packages),
        res = [],
        item;

    // turn active into an array (so themes and apps can be checked the same)
    if (!Array.isArray(active)) {
        active = [active];
    }

    _.each(pathKeys, function (key) {
        // do not include hidden files or _messages
        if (key.indexOf('.') !== 0 &&
            key !== '_messages' &&
            key !== 'README.md'
        ) {
            item = {
                name: key
            };
            if (packages[key].hasOwnProperty('package.json')) {
                item.package = packages[key]['package.json'];
            } else {
                item.package = false;
            }

            if (_.indexOf(active, key) !== -1) {
                item.active = true;
            }
            res.push(item);
        }
    });

    return res;
};

module.exports = filterPackages;
