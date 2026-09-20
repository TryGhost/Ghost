import ApplicationAdapter from 'ghost-admin/adapters/application';

export default class Tier extends ApplicationAdapter {
    queryRecord(store, type, query) {
        if (query && query.id) {
            const {id} = query;
            delete query.id;
            const url = this.buildURL(type.modelName, id, query, 'findRecord');
            return this.ajax(url, 'GET', {data: query});
        }

        return super.queryRecord(...arguments);
    }

    urlForDeleteRecord() {
        const url = super.urlForDeleteRecord(...arguments);
        const parsedUrl = new URL(url);

        return parsedUrl.toString();
    }
}
