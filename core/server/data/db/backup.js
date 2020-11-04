// # Backup Database
// Provides for backing up the database before making potentially destructive changes
const fs = require('fs-extra');

const path = require('path');
const Promise = require('bluebird');
const config = require('../../../shared/config');
const logging = require('../../../shared/logging');
const urlUtils = require('../../../shared/url-utils');
const exporter = require('../exporter');

const writeExportFile = function writeExportFile(exportResult) {
    const filename = path.resolve(urlUtils.urlJoin(config.get('paths').contentPath, 'data', exportResult.filename));

    return Promise.resolve(fs.writeFile(filename, JSON.stringify(exportResult.data))).return(filename);
};

const readBackup = async (filename) => {
    const parsedFileName = path.parse(filename);
    const sanitized = `${parsedFileName.name}${parsedFileName.ext}`;
    const backupPath = path.resolve(urlUtils.urlJoin(config.get('paths').contentPath, 'data', sanitized));

    const exists = await fs.pathExists(backupPath);

    if (exists) {
        const backupFile = await fs.readFile(backupPath);
        return JSON.parse(backupFile);
    } else {
        return null;
    }
};

/**
 * ## Backup
 * does an export, and stores this in a local file
 * @returns {Promise<*>}
 */
const backup = function backup(options) {
    logging.info('Creating database backup');
    options = options || {};

    const props = {
        data: exporter.doExport(options),
        filename: exporter.fileName(options)
    };

    return Promise.props(props)
        .then(writeExportFile)
        .then(function successMessage(filename) {
            logging.info('Database backup written to: ' + filename);
            return filename;
        });
};

module.exports = {
    backup,
    readBackup
};
