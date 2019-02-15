const debug = require('ghost-ignition').debug('api:v2:utils:serializers:output:db');

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

    importContentAsync(response, apiConfig, frame) {
        debug('importContentAsync');

        frame.response = {
            db: [],
            importId: response
        };
    },

    asyncImportStatus(status, apiConfig, frame) {
        debug('asyncImportStatus');

        status.importing = status.busy;
        delete status.busy;

        if (status.lastResult) {
            if (status.lastResult.error) {
                status.lastResult.errors = [status.lastResult.error];
                delete status.lastResult.error;
            }

            if (status.lastResult.result) {
                const {result} = status.lastResult;
                // NOTE: response can contain 2 objects if images are imported
                status.lastResult.problems = result[result.length === 2 ? 1 : 0].problems;
                delete status.lastResult.result;
            }
        }


        frame.response = status;
    },

    deleteAllContent(response, apiConfig, frame) {
        frame.response = {
            db: []
        };
    }
};

