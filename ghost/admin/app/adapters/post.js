import ApplicationAdapter from 'ghost-admin/adapters/application';

export default ApplicationAdapter.extend({
    // posts and pages now include everything by default
    buildIncludeURL(store, modelName, id, snapshot, requestType, query) {
        return this.buildURL(modelName, id, snapshot, requestType, query);
    },

    buildQuery(store, modelName, options) {
        return options;
    }
});
