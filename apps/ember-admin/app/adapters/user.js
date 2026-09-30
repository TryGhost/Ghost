import ApplicationAdapter from 'ghost-admin/adapters/application';
import SlugUrl from 'ghost-admin/utils/slug-url';

export default class User extends ApplicationAdapter {
    buildURL(_modelName, _id, _snapshot, _requestType, query) {
        const url = super.buildURL(...arguments);

        return SlugUrl(url, query);
    }

    queryRecord(store, type, query) {
        if (!query || query.id !== 'me') {
            return super.queryRecord(...arguments);
        }

        const url = this.buildURL(type.modelName, 'me', null, 'findRecord');

        return this.ajax(url, 'GET', {data: {include: 'roles'}});
    }
}
