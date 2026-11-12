// # Backup Database
// Provides for backing up the database before making potentially destructive changes
const fs = require('fs-extra');
const { pipeline } = require('stream/promises');

const path = require('path');
const config = require('../../../shared/config');
const logging = require('@tryghost/logging');
const urlUtils = require('../../../shared/url-utils').default;
const exporter = require('../exporter');

/**
 * Streams the export straight to disk so the full JSON is never held in memory
 *
 * @param {string} filename
 * @param {object} options - passed through to the exporter
 * @returns {Promise<string>} the path of the written file
 */
const writeExportFile = async (filename, options) => {
  const filePath = path.resolve(
    urlUtils.urlJoin(config.get('paths').contentPath, 'data', filename),
  );

  const fileStream = fs.createWriteStream(filePath);

  try {
    await pipeline(exporter.streamExport(options), fileStream);
  } catch (err) {
    // pipeline can reject before the destroyed file stream has finished opening and closing,
    // which would recreate the file after it's removed
    if (!fileStream.closed) {
      await new Promise((resolve) => {
        fileStream.once('close', resolve);
      });
    }
    // a partial file isn't valid JSON, so don't leave it behind to be mistaken for a backup
    await fs.remove(filePath);
    throw err;
  }

  return filePath;
};

/**
 * @param {string} filename
 */
const readBackup = async (filename) => {
  const parsedFileName = path.parse(filename);
  const sanitized = `${parsedFileName.name}${parsedFileName.ext}`;
  const backupPath = path.resolve(
    urlUtils.urlJoin(config.get('paths').contentPath, 'data', sanitized),
  );

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
  const filePath = await writeExportFile(filename, options);

  logging.info(`Database backup written to ${filePath}`);
  return filePath;
};

module.exports = {
  backup,
  readBackup,
};
