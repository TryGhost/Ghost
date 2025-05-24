// # Backup Database
// Provides for backing up the database before making potentially destructive changes
const fs = require('fs-extra');

const path = require('path');
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
    console.log('AAAAAA contentPath', config.get('paths').contentPath);
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
        const backupFile = await fs.readFile(backupPath, 'utf8');
        return JSON.parse(backupFile);
    } else {
        return null;
    }
};

/**
 * Does an export, and stores this in a local file
 *
 * @param {Object} options
 * @returns {Promise<String> | null}
 */
const backup = async function backup(options = {}) {
    // do not create backup if disabled in config (this is intended for large customers who will OOM node)
    if (config.get('disableJSBackups')) {
        logging.info('Database backup is disabled in Ghost config');
        return null;
    }

    logging.info('Creating database backup');

    const filename = await exporter.fileName(options);
    console.log('AAASSS filename', filename);
    const data = await exporter.doExport(options);

    const filePath = await writeExportFile({
        data,
        filename
    });

    console.log('BBBAAASSS filePath', filePath);

    logging.info(`Database backup written to ${filePath}`);
    return filePath;
};

module.exports = {
    backup,
    readBackup
};
