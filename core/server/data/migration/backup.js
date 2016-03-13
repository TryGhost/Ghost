// # Backup Database
// Provides for backing up the database before making potentially destructive changes
var _        = require('lodash'),
    fs       = require('fs'),
    path     = require('path'),
    Promise  = require('bluebird'),
    config   = require('../../config'),
    exporter = require('../export'),

    writeExportFile,
    backup;

writeExportFile = function writeExportFile(exportResult) {
    var filename = path.resolve(config.paths.contentPath + '/data/' + exportResult.filename);

    return Promise.promisify(fs.writeFile)(filename, JSON.stringify(exportResult.data)).return(filename);
};

/**
 * ## Backup
 * does an export, and stores this in a local file
 *
 * @param {Function} [logInfo]
 * @returns {Promise<*>}
 */
backup = function backup(logInfo) {
    // If we get passed a function, use it to output noticies, else don't do anything
    logInfo = _.isFunction(logInfo) ? logInfo : _.noop;

    logInfo('Creating database backup');

    var props = {
        data: exporter.doExport(),
        filename: exporter.fileName()
    };

    return Promise.props(props)
        .then(writeExportFile)
        .then(function successMessage(filename) {
            logInfo('Database backup written to: ' + filename);
        });
};

module.exports = backup;
