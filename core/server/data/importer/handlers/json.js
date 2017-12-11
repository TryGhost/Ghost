var _ = require('lodash'),
    Promise = require('bluebird'),
    fs = require('fs-extra'),
    common = require('../../../lib/common'),
    JSONHandler;

JSONHandler = {
    type: 'data',
    extensions: ['.json'],
    contentTypes: ['application/octet-stream', 'application/json'],
    directories: [],

    loadFile: function (files, startDir) { // eslint-disable-line no-unused-vars
        // @TODO: Handle multiple JSON files
        var filePath = files[0].path;

        return Promise.promisify(fs.readFile)(filePath).then(function (fileData) {
            var importData;
            try {
                importData = JSON.parse(fileData);

                // if importData follows JSON-API format `{ db: [exportedData] }`
                if (_.keys(importData).length === 1) {
                    if (!importData.db || !Array.isArray(importData.db)) {
                        throw new common.errors.GhostError({
                            message: common.i18n.t('errors.data.importer.handlers.json.invalidJsonFormat')
                        });
                    }

                    importData = importData.db[0];
                }

                return importData;
            } catch (err) {
                return Promise.reject(new common.errors.BadRequestError({
                    err: err,
                    message: err.message,
                    help: common.i18n.t('errors.data.importer.handlers.json.checkImportJsonIsValid')
                }));
            }
        });
    }
};

module.exports = JSONHandler;
