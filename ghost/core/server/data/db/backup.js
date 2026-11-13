// # Backup Database
// Provides for backing up the database before making potentially destructive changes
const fs = require('fs-extra');

const path = require('path');
const { pipeline } = require('stream/promises');
const config = require('../../../shared/config');
const logging = require('@tryghost/logging');
const urlUtils = require('../../../shared/url-utils').default;
const exporter = require('../exporter');
const { createJsonStream } = require('../exporter/json-stream');

/**
 * @param {object} exportResult
 * @param {string} exportResult.filename
 * @param {object} exportResult.data
 */
const writeExportFile = async (exportResult) => {
  const filename = path.resolve(
    urlUtils.urlJoin(config.get('paths').contentPath, 'data', exportResult.filename),
  );

  // Streamed because a large site's export can exceed V8's maximum string length
  try {
    await pipeline(createJsonStream(exportResult.data), fs.createWriteStream(filename));
  } catch (err) {
    // A partial file would be served later as a corrupt backup
    await fs.remove(filename).catch(() => {});
    throw err;
  }

  return filename;
};

/**
 * Opens a backup written by `backup()` as a stream, so a large backup is never
 * read into memory as one string.
 *
 * @param {string} filename
 * @returns {Promise<import('stream').Readable | null>} null when no such backup exists
 */
const readBackupStream = async (filename) => {
  const parsedFileName = path.parse(filename);
  const sanitized = `${parsedFileName.name}${parsedFileName.ext}`;
  const backupPath = path.resolve(
    urlUtils.urlJoin(config.get('paths').contentPath, 'data', sanitized),
  );

  const exists = await fs.pathExists(backupPath);

  if (!exists) {
    return null;
  }

  return fs.createReadStream(backupPath);
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
  const data = await exporter.doExport(options);

  const filePath = await writeExportFile({
    data,
    filename,
  });

  logging.info(`Database backup written to ${filePath}`);
  return filePath;
};

module.exports = {
  backup,
  readBackupStream,
};
