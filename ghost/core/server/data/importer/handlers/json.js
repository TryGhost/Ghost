const _ = require('lodash');
const fs = require('fs-extra');
const tpl = require('@tryghost/tpl');
const errors = require('@tryghost/errors');
const debug = require('@tryghost/debug')('importer:handler:data');

const messages = {
  invalidJsonFormat: 'Invalid JSON format, expected `{ db: [exportedData] }`',
  checkImportJsonIsValid: 'check that the import file is valid JSON.',
};

/**
 * @param {{path: string}} file
 * @returns {Promise<Object>}
 */
async function parseFile(file) {
  const fileData = await fs.readFile(file.path);
  let importData;

  try {
    importData = JSON.parse(fileData);

    // if importData follows JSON-API format `{ db: [exportedData] }`
    if (_.keys(importData).length === 1) {
      if (!importData.db || !Array.isArray(importData.db)) {
        throw new errors.InternalServerError({
          message: tpl(messages.invalidJsonFormat),
        });
      }

      importData = importData.db[0];
    }

    return importData;
  } catch (err) {
    throw new errors.BadRequestError({
      err,
      message: err.message,
      help: tpl(messages.checkImportJsonIsValid),
    });
  }
}

const JSONHandler = {
  type: 'data',
  extensions: ['.json'],
  contentTypes: ['application/octet-stream', 'application/json'],
  directories: [],

  // eslint-disable-next-line no-unused-vars
  loadFile: async function (files, startDir) {
    debug('loadFile', files);

    // Site export zips also carry theme, redirects and metadata JSON, so pick the shallowest Ghost export
    const candidates = _.sortBy(files, [(file) => file.name.split('/').length, 'name']);

    if (candidates.length > 1) {
      for (const file of candidates) {
        try {
          const importData = await parseFile(file);
          if (importData?.meta?.version) {
            return importData;
          }
        } catch (err) {
          debug('skipping', file.name, err.message);
        }
      }
    }

    return parseFile(candidates[0]);
  },
};

module.exports = JSONHandler;
