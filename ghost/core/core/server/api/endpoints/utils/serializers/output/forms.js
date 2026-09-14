module.exports = {
    browseSubmissions(response, apiConfig, frame) {
        frame.response = {
            form_submissions: response.data ? response.data.map(model => (model.toJSON ? model.toJSON(frame.options) : model)) : [response],
            meta: response.meta
        };
    },

    exportSubmissions(response, apiConfig, frame) {
        frame.response = response;
    }
};
