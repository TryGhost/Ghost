const debug = require('@tryghost/debug')('api:endpoints:utils:serializers:output:db');

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

        frame.response = {
            db: []
        };

        frame.response.problems = response?.data?.problems ?? [];
    },

    deleteAllContent(response, apiConfig, frame) {
        frame.response = {
            db: []
        };
    }
};

