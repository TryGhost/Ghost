import ApplicationAdapter from 'ghost-admin/adapters/application';

export default class Post extends ApplicationAdapter {
    // posts and pages now include everything by default
    buildIncludeURL(store, modelName, id, snapshot, requestType, query) {
        const url = this.buildURL(modelName, id, snapshot, requestType, query);
        const parsedUrl = new URL(url);

        if (snapshot?.adapterOptions?.sendEmailWhenPublished) {
            let emailRecipientFilter = snapshot.adapterOptions.sendEmailWhenPublished;

            if (emailRecipientFilter === 'status:free,status:-free') {
                emailRecipientFilter = 'all';
            }

            parsedUrl.searchParams.append('email_recipient_filter', emailRecipientFilter);
        }

        if (snapshot?.adapterOptions?.newsletterId) {
            const newsletterId = snapshot.adapterOptions.newsletterId;
            parsedUrl.searchParams.append('newsletter_id', newsletterId);
        }

        return parsedUrl.toString();
    }

    buildQuery(store, modelName, options) {
        return options;
    }
}
