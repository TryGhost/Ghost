import ApplicationAdapter from './application';

export default class ApiKey extends ApplicationAdapter {
    queryRecord(store, type, query) {
        if (!query || query.id !== 'me') {
            return super.queryRecord(...arguments);
        }

        const url = `${this.buildURL('users', 'me')}token/`;
        return this.ajax(url, 'GET', {data: {}}).then((data) => {
            return data;
        });
    }
}
