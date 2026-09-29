const fs = require('fs-extra');
const path = require('path');
const { pipeline } = require('node:stream/promises');
const { ZipArchive } = require('archiver');

// Uploads that are not archives are wrapped in a single entry archive, so every
// stored upload is a ZIP. The wrapper uses this directory name so execution can
// tell a wrapped upload from an ordinary uploaded archive.
const STANDALONE_UPLOAD_DIRECTORY = 'ghost-standalone-upload';

/**
 * Stream a single uploaded file into a ZIP archive, preserving its file name
 * @param {{name: string, path: string}} file
 * @param {string} targetPath where to write the archive
 * @returns {Promise<void>}
 */
async function convertFileToZip(file, targetPath) {
  const archive = new ZipArchive();
  const source = fs.createReadStream(file.path);
  // archiver does not forward errors from appended source streams.
  source.on('error', (error) => archive.destroy(error));
  const written = pipeline(archive, fs.createWriteStream(targetPath));
  archive.append(source, {
    name: `${STANDALONE_UPLOAD_DIRECTORY}/${path.basename(file.name)}`,
  });

  try {
    await Promise.all([archive.finalize(), written]);
  } finally {
    source.destroy();
  }
}

module.exports = { convertFileToZip, STANDALONE_UPLOAD_DIRECTORY };
