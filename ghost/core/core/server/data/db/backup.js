// # Backup Database
// Provides for backing up the database before making potentially destructive changes
const fs = require('fs-extra');

const path = require('path');
const Promise = require('bluebird');
const config = require('../../../shared/config');
const logging = require('@tryghost/logging');
const urlUtils = require('../../../shared/url-utils');
const exporter = require('../exporter');

/**
 * @param {object} exportResult
 * @param {string} exportResult.filename
 * @param {object} exportResult.data
 */
const writeExportFile = async (exportResult) => {
    const filename = path.resolve(urlUtils.urlJoin(config.get('paths').contentPath, 'data', exportResult.filename));

    await fs.writeFile(filename, JSON.stringify(exportResult.data));
    return filename;
};

/**
 * @param {string} filename
 */
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
const backup = async function backup(options = {}) {
    logging.info('Creating database backup');

    const props = {
        data: exporter.doExport(options),
        filename: exporter.fileName(options)
    };

    const exportResult = await Promise.props(props);
    const filename = await writeExportFile(exportResult);

    logging.info('Database backup written to: ' + filename);
    return filename;
};

module.exports = {
    backup,
    readBackup
};
