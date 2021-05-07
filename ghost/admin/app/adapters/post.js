import ApplicationAdapter from 'ghost-admin/adapters/application';

export default ApplicationAdapter.extend({
    // posts and pages now include everything by default
    buildIncludeURL(store, modelName, id, snapshot, requestType, query) {
        let url = this.buildURL(modelName, id, snapshot, requestType, query);
        let parsedUrl = new URL(url);

        if (snapshot && snapshot.adapterOptions && snapshot.adapterOptions.sendEmailWhenPublished) {
            let emailRecipientFilter = snapshot.adapterOptions.sendEmailWhenPublished;

            if (emailRecipientFilter === 'status:free,status:-free') {
                emailRecipientFilter = 'all';
            }

            parsedUrl.searchParams.append('email_recipient_filter', emailRecipientFilter);
        }

        return parsedUrl.toString();
    },

    buildQuery(store, modelName, options) {
        return options;
    }
});
