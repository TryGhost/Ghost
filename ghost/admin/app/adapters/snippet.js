import ApplicationAdapter from 'ghost-admin/adapters/application';

export default class Snippet extends ApplicationAdapter {
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
