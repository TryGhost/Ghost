var _            = require('lodash'),
    Promise      = require('bluebird'),
    fs           = require('fs-extra'),
    errors       = require('../../../errors'),
    i18n         = require('../../../i18n'),
    JSONHandler;

JSONHandler = {
    type: 'data',
    extensions: ['.json'],
    types: ['application/octet-stream', 'application/json'],
    directories: [],

    loadFile: function (files, startDir) {
        /*jshint unused:false */
        // @TODO: Handle multiple JSON files
        var filePath = files[0].path;

        return Promise.promisify(fs.readFile)(filePath).then(function (fileData) {
            var importData;
            try {
                importData = JSON.parse(fileData);

                // if importData follows JSON-API format `{ db: [exportedData] }`
                if (_.keys(importData).length === 1) {
                    if (!importData.db || !Array.isArray(importData.db)) {
                        throw new Error(i18n.t('errors.data.importer.handlers.json.invalidJsonFormat'));
                    }

                    importData = importData.db[0];
                }

                return importData;
            } catch (e) {
                errors.logError(e, i18n.t('errors.data.importer.handlers.json.apiDbImportContent'),
                                i18n.t('errors.data.importer.handlers.json.checkImportJsonIsValid'));
                return Promise.reject(new errors.BadRequestError(i18n.t('errors.data.importer.handlers.json.failedToParseImportJson')));
            }
        });
    }
};

module.exports = JSONHandler;
