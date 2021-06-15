const debug = require('@tryghost/debug')('api:v3:utils:serializers:output:db');

module.exports = {
    backupContent(filename, apiConfig, frame) {
        debug('backupContent');

        frame.response = {
            db: [{filename: filename}]
        };
    },

    exportContent(exportedData, apiConfig, frame) {
        debug('exportContent');

        frame.response = {
            db: [exportedData]
        };
    },

    importContent(response, apiConfig, frame) {
        debug('importContent');

        // NOTE: response can contain 2 objects if images are imported
        const problems = (response.length === 2)
            ? response[1].problems
            : response[0].problems;

        frame.response = {
            db: [],
            problems: problems
        };
    },

    deleteAllContent(response, apiConfig, frame) {
        frame.response = {
            db: []
        };
    }
};

