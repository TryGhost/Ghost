import ApplicationAdapter from 'ghost-admin/adapters/application';
import SlugUrl from 'ghost-admin/mixins/slug-url';

export default ApplicationAdapter.extend(SlugUrl, {
    find(store, type, id) {
        return this.findQuery(store, type, {id, status: 'all'});
    },

    // TODO: This is needed because the API currently expects you to know the
    // status of the record before retrieving by ID. Quick fix is to always
    // include status=all in the query
    findRecord(store, type, id, snapshot) {
        let url = this.buildIncludeURL(store, type.modelName, id, snapshot, 'findRecord');

        url += '&status=all';

        return this.ajax(url, 'GET');
    },

    findAll(store, type, id) {
        return this.query(store, type, {id, status: 'all'});
    },

    queryRecord(store, type, query) {
        if (!query || query.id !== 'me') {
            return this._super(...arguments);
        }

        let url = this.buildURL(type.modelName, 'me', null, 'findRecord');

        return this.ajax(url, 'GET', {data: {include: 'roles'}});
    }
});
