/**
 * # Package Utils
 *
 * Ghost has / is in the process of gaining support for several different types of sub-packages:
 * - Themes: have always been packages, but we're going to lean more heavily on npm & package.json in future
 * - Adapters: replace fundamental pieces like storage, will become npm modules
 *
 * These utils facilitate loading, reading, managing etc, packages from the file system.
 */

module.exports = {
    get read() {
        return require('./read');
    },

    get parse() {
        return require('./parse');
    },

    get filter() {
        return require('./filter');
    }
};
