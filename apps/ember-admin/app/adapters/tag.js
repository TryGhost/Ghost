import ApplicationAdapter from 'ghost-admin/adapters/application';
import SlugUrl from 'ghost-admin/utils/slug-url';

export default class Tag extends ApplicationAdapter {
    buildURL(_modelName, _id, _snapshot, _requestType, query) {
        const url = super.buildURL(...arguments);

        return SlugUrl(url, query);
    }
}
