/**
 * # Package Utils
 *
 * Ghost has / is in the process of gaining support for several different types of sub-packages:
 * - Themes: have always been packages, but we're going to lean more heavily on npm & package.json in future
 * - Adapters: an early version of apps, replace fundamental pieces like storage, will become npm modules
 * - Apps: plugins that can be installed whilst Ghost is running & modify behaviour
 * - More?
 *
 * These utils facilitate loading, reading, managing etc, packages from the file system.
 */

module.exports = {
    read: require('./read-packages'),
    parsePackageJSON: require('./parse-package-json'),
    filterPackages: require('./filter-packages')
};
