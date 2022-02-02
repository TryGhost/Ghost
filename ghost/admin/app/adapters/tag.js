import ApplicationAdapter from 'ghost-admin/adapters/application';
import SlugUrl from 'ghost-admin/utils/slug-url';
import classic from 'ember-classic-decorator';

@classic
export default class Tag extends ApplicationAdapter {
    buildURL(_modelName, _id, _snapshot, _requestType, query) {
        let url = super.buildURL(...arguments);

        return SlugUrl(url, query);
    }
}