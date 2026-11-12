const { Readable } = require('stream');
const debug = require('@tryghost/debug')('api:endpoints:utils:serializers:output:db');
const exporter = require('../../../../../data/exporter');
const { createJsonStream } = require('../../../../../data/exporter/json-stream');
const { createStreamResponse } = require('./stream-response');
const { removeXBY } = require('./utils/remove-x-by');

/**
 * Wraps a backup file's JSON in the export envelope without parsing it, so a
 * backup too large to hold as one string can still be downloaded.
 *
 * @param {Readable} backupFile
 * @returns {Readable}
 */
function wrapBackupFile(backupFile) {
  async function* wrap() {
    yield '{"db":[';
    yield* backupFile;
    yield ']}';
  }

  return Readable.from(wrap(), { objectMode: false });
}

module.exports = {
  backupContent(filename, apiConfig, frame) {
    debug('backupContent');

    frame.response = {
      db: [{ filename: filename }],
    };
  },

  // Streamed because a large site's export can exceed V8's maximum string length.
  // A stream response skips the `all` serializer, so published_by is removed here
  // from a fresh export. A stored backup is sent byte for byte, as it was written.
  async exportContent(exportedData, apiConfig, frame) {
    debug('exportContent');

    const source =
      exportedData instanceof Readable
        ? wrapBackupFile(exportedData)
        : createJsonStream(removeXBY({ db: [exportedData] }));

    frame.response = createStreamResponse({
      source,
      filename: await exporter.fileName(),
      contentType: 'application/json; charset=utf-8',
      compressible: true,
    });
  },

  importContent(response, apiConfig, frame) {
    debug('importContent');

    frame.response = {
      db: [],
    };

    frame.response.problems = response?.data?.problems ?? [];
  },

  deleteAllContent(response, apiConfig, frame) {
    frame.response = {
      db: [],
    };
  },
};
