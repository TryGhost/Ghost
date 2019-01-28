import ApplicationAdapter from 'ghost-admin/adapters/application';
import SlugUrl from 'ghost-admin/mixins/slug-url';

export default ApplicationAdapter.extend(SlugUrl, {
    queryRecord(store, type, query) {
        if (!query || query.id !== 'me') {
            return this._super(...arguments);
        }

        let url = this.buildURL(type.modelName, 'me', null, 'findRecord');

        return this.ajax(url, 'GET', {data: {include: 'roles'}});
    }
});
