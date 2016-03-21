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
 * @param {{info: logger.info, warn: logger.warn}} [logger]
 * @returns {Promise<*>}
 */
backup = function backup(logger) {
    // If we get passed a function, use it to output notices, else don't do anything
    logger = logger && _.isFunction(logger.info) ? logger : {info: _.noop};

    logger.info('Creating database backup');

    var props = {
        data: exporter.doExport(),
        filename: exporter.fileName()
    };

    return Promise.props(props)
        .then(writeExportFile)
        .then(function successMessage(filename) {
            logger.info('Database backup written to: ' + filename);
        });
};

module.exports = backup;
