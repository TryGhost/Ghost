import ApplicationAdapter from 'ghost-admin/adapters/application';

export default class Post extends ApplicationAdapter {
    // posts and pages now include everything by default
    buildIncludeURL(store, modelName, id, snapshot, requestType, query) {
        const url = this.buildURL(modelName, id, snapshot, requestType, query);
        const parsedUrl = new URL(url);

        if (snapshot?.adapterOptions?.newsletter) {
            const newsletter = snapshot.adapterOptions.newsletter;
            parsedUrl.searchParams.append('newsletter', newsletter);

            let emailSegment = snapshot?.adapterOptions?.emailSegment;

            if (emailSegment) {
                if (emailSegment === 'status:free,status:-free') {
                    emailSegment = 'all';
                }

                parsedUrl.searchParams.append('email_segment', emailSegment);
            }
        }

        return parsedUrl.toString();
    }

    buildURL() {
        const url = super.buildURL(...arguments);

        try {
            const parsedUrl = new URL(url);
            if (!parsedUrl.searchParams.get('formats')) {
                parsedUrl.searchParams.set('formats', 'mobiledoc,lexical');
                return parsedUrl.href;
            }
        } catch (e) {
            // noop, just use the original url
            console.error('Couldn\'t parse URL', e); // eslint-disable-line
        }

        return url;
    }
}
