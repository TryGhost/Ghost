const _ = require('lodash');
const Promise = require('bluebird');
const fs = require('fs-extra');
const tpl = require('@tryghost/tpl');
const errors = require('@tryghost/errors');

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

    loadFile: function (files, startDir) { // eslint-disable-line no-unused-vars
        // @TODO: Handle multiple JSON files
        const filePath = files[0].path;

        return fs.readFile(filePath).then(function (fileData) {
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
                return Promise.reject(new errors.BadRequestError({
                    err: err,
                    message: err.message,
                    help: tpl(messages.checkImportJsonIsValid)
                }));
            }
        });
    }
};

module.exports = JSONHandler;
