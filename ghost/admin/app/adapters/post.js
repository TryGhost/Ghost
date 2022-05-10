import ApplicationAdapter from 'ghost-admin/adapters/application';

export default class Post extends ApplicationAdapter {
    // posts and pages now include everything by default
    buildIncludeURL(store, modelName, id, snapshot, requestType, query) {
        const url = this.buildURL(modelName, id, snapshot, requestType, query);
        const parsedUrl = new URL(url);

        // TODO: cleanup sendEmailWhenPublished when removing publishingFlow flag
        let emailRecipientFilter = snapshot?.adapterOptions?.emailRecipientFilter
            || snapshot?.adapterOptions?.sendEmailWhenPublished;

        if (emailRecipientFilter) {
            if (emailRecipientFilter === 'status:free,status:-free') {
                emailRecipientFilter = 'all';
            }

            parsedUrl.searchParams.append('email_recipient_filter', emailRecipientFilter);
        }

        if (snapshot?.adapterOptions?.newsletter) {
            // TODO: rename newsletter_id to newsletter once changed in the backend
            const newsletterId = snapshot.adapterOptions.newsletter;
            parsedUrl.searchParams.append('newsletter_id', newsletterId);
        }

        return parsedUrl.toString();
    }

    buildQuery(store, modelName, options) {
        return options;
    }
}
