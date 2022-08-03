import ApplicationAdapter from 'ghost-admin/adapters/application';
import classic from 'ember-classic-decorator';

@classic
export default class Offer extends ApplicationAdapter {
    queryRecord(store, type, query) {
        if (query && query.id) {
            let {id} = query;
            delete query.id;
            let url = this.buildURL(type.modelName, id, query, 'findRecord');
            return this.ajax(url, 'GET', {data: query});
        }

        return super.queryRecord(...arguments);
    }

    urlForDeleteRecord() {
        let url = super.urlForDeleteRecord(...arguments);
        let parsedUrl = new URL(url);

        return parsedUrl.toString();
    }
}
