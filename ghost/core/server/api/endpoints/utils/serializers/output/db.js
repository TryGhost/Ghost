const debug = require('@tryghost/debug')('api:endpoints:utils:serializers:output:db');
const exporter = require('../../../../../data/exporter');
const { createJsonStream } = require('../../../../../data/exporter/json-stream');
const { createStreamResponse } = require('./stream-response');
const { removeXBY } = require('./utils/remove-x-by');

module.exports = {
  backupContent(filename, apiConfig, frame) {
    debug('backupContent');

    frame.response = {
      db: [{ filename: filename }],
    };
  },

  // Streamed because a large site's export can exceed V8's maximum string length.
  // A stream response skips the `all` serializer, so published_by is removed here.
  async exportContent(exportedData, apiConfig, frame) {
    debug('exportContent');

    frame.response = createStreamResponse({
      source: createJsonStream(removeXBY({ db: [exportedData] })),
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
