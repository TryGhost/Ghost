import ApplicationAdapter from 'ghost-admin/adapters/application';

export const ALL_POST_INCLUDES = [
    'tags',
    'authors',
    'authors.roles',
    'email',
    'tiers',
    'newsletter',
    'count.clicks',
    'post_revisions',
    'post_revisions.author'
].join(',');

export default class Post extends ApplicationAdapter {
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

        if (snapshot?.adapterOptions?.saveRevision) {
            const saveRevision = snapshot.adapterOptions.saveRevision;
            parsedUrl.searchParams.append('save_revision', saveRevision);
        }

        if (snapshot?.adapterOptions?.convertToLexical) {
            const convertToLexical = snapshot.adapterOptions.convertToLexical;
            parsedUrl.searchParams.append('convert_to_lexical', convertToLexical);
        }

        // on create/update we need to explicitly request post_revisions to be included
        // so we can compare and create a new one later if needed but that means we
        // have to specify every post include option
        if (requestType === 'createRecord' || requestType === 'updateRecord') {
            parsedUrl.searchParams.append('include', ALL_POST_INCLUDES);
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

    // posts and pages now include all relations by default so we don't want
    // EmbeddedRelationAdapter.buildQuery adding an `?include=` param that
    // overrides the defaults with a more restrictive list
    buildQuery(store, modelName, options) {
        return options;
    }
}
