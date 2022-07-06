import ApplicationAdapter from 'ghost-admin/adapters/application';
import SlugUrl from 'ghost-admin/utils/slug-url';
import classic from 'ember-classic-decorator';

@classic
export default class User extends ApplicationAdapter {
    buildURL(_modelName, _id, _snapshot, _requestType, query) {
        let url = super.buildURL(...arguments);

        return SlugUrl(url, query);
    }

    queryRecord(store, type, query) {
        if (!query || query.id !== 'me') {
            return super.queryRecord(...arguments);
        }

        let url = this.buildURL(type.modelName, 'me', null, 'findRecord');

        return this.ajax(url, 'GET', {data: {include: 'roles'}});
    }
}
