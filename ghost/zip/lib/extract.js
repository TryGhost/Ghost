const defaultOptions = {};

/**
 * Extract
 *
 * - Unzip an archive to a folder
 *
 * @param {String} zipToExtract - full path to zip file that should be extracted
 * @param {String} destination - full path of the extraction target
 * @param {Object} [options]
 * @param {Integer} options.defaultDirMode - Directory Mode (permissions), defaults to 0o755
 * @param {Integer} options.defaultFileMode - File Mode (permissions), defaults to 0o644
 * @param {Function} options.onEntry - if present, will be called with (entry, zipfile) for every entry in the zip
 */
module.exports = (zipToExtract, destination, options) => {
    const opts = Object.assign({}, defaultOptions, options);

    const extract = require('extract-zip');

    opts.dir = destination;

    return extract(zipToExtract, opts).then(() => {
        return {path: destination};
    });
};
