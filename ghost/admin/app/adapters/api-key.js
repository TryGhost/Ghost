import ApplicationAdapter from './application';
import classic from 'ember-classic-decorator';

@classic
export default class ApiKey extends ApplicationAdapter {
    queryRecord(store, type, query) {
        if (!query || query.id !== 'me') {
            return super.queryRecord(...arguments);
        }

        let url = `${this.buildURL('users', 'me')}token/`;
        return this.ajax(url, 'GET', {data: {}}).then((data) => {
            return data;
        });
    }
}
