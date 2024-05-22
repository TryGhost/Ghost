const batchMapper = require('./mappers/email-batches');
const failureMapper = require('./mappers/email-failures');

module.exports = {
    browseBatches(response, apiConfig, frame) {
        frame.response = {};

        if (response.data) {
            frame.response.batches = response.data.map(model => batchMapper(model, frame));
        } else {
            frame.response.batches = [batchMapper(response, frame)];
        }

        if (response.meta) {
            frame.response.meta = response.meta;
        }
    },

    browseFailures(response, apiConfig, frame) {
        frame.response = {};

        if (response.data) {
            frame.response.failures = response.data.map(model => failureMapper(model, frame));
        } else {
            frame.response.failures = [failureMapper(response, frame)];
        }

        if (response.meta) {
            frame.response.meta = response.meta;
        }
    },

    analyticsStatus(response, apiConfig, frame) {
        frame.response = response;
    }
};
