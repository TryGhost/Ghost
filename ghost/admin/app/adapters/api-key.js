import ApplicationAdapter from './application';

export default ApplicationAdapter.extend({

    queryRecord(store, type, query) {
        if (!query || query.id !== 'me') {
            return this._super(...arguments);
        }

        let url = `${this.buildURL('users', 'me')}token/`;
        return this.ajax(url, 'GET', {data: {}}).then((data) => {
            return data;
        });
    }

});
