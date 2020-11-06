import ApplicationAdapter from 'ghost-admin/adapters/application';

export default ApplicationAdapter.extend({
    // posts and pages now include everything by default
    buildIncludeURL(store, modelName, id, snapshot, requestType, query) {
        let url = this.buildURL(modelName, id, snapshot, requestType, query);
        let parsedUrl = new URL(url);

        if (snapshot && snapshot.adapterOptions && snapshot.adapterOptions.sendEmailWhenPublished) {
            parsedUrl.searchParams.append('email_recipient_filter', snapshot.adapterOptions.sendEmailWhenPublished);
        }

        return parsedUrl.toString();
    },

    buildQuery(store, modelName, options) {
        return options;
    }
});
