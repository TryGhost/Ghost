module.exports = {
    addSubmission(response, apiConfig, frame) {
        const data = response && response.toJSON ? response.toJSON(frame.options) : response;
        frame.response = {
            form_submissions: [data]
        };
    },

    browseSubmissions(response, apiConfig, frame) {
        frame.response = {
            form_submissions: response.data ? (Array.isArray(response.data) ? response.data.map(model => (model.toJSON ? model.toJSON(frame.options) : model)) : [response.data]) : [response],
            meta: response.meta
        };
    },

    exportSubmissions(response, apiConfig, frame) {
        frame.response = response;
    },

    browseAttachedPosts(response, apiConfig, frame) {
        frame.response = response;
    },

    attachToPost(response, apiConfig, frame) {
        frame.response = response;
    },

    detachFromPost(response, apiConfig, frame) {
        frame.response = response;
    }
};
