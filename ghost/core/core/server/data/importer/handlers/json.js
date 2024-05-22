const _ = require('lodash');
const fs = require('fs-extra');
const tpl = require('@tryghost/tpl');
const errors = require('@tryghost/errors');
const debug = require('@tryghost/debug')('importer:handler:data');

const messages = {
    invalidJsonFormat: 'Invalid JSON format, expected `{ db: [exportedData] }`',
    checkImportJsonIsValid: 'check that the import file is valid JSON.'
};

let JSONHandler;

JSONHandler = {
    type: 'data',
    extensions: ['.json'],
    contentTypes: ['application/octet-stream', 'application/json'],
    directories: [],

    loadFile: async function (files, startDir) { // eslint-disable-line no-unused-vars
        debug('loadFile', files);
        // @TODO: Handle multiple JSON files
        const filePath = files[0].path;

        const fileData = await fs.readFile(filePath);
        let importData;

        try {
            importData = JSON.parse(fileData);

            // if importData follows JSON-API format `{ db: [exportedData] }`
            if (_.keys(importData).length === 1) {
                if (!importData.db || !Array.isArray(importData.db)) {
                    throw new errors.InternalServerError({
                        message: tpl(messages.invalidJsonFormat)
                    });
                }

                importData = importData.db[0];
            }

            return importData;
        } catch (err) {
            throw new errors.BadRequestError({
                err,
                message: err.message,
                help: tpl(messages.checkImportJsonIsValid)
            });
        }
    }
};

module.exports = JSONHandler;
