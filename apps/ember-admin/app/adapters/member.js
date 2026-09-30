import ApplicationAdapter from 'ghost-admin/adapters/application';

export default class Member extends ApplicationAdapter {
    queryRecord(store, type, query) {
        if (query && query.id) {
            const {id} = query;
            delete query.id;
            const url = this.buildURL(type.modelName, id, query, 'findRecord');
            return this.ajax(url, 'GET', {data: query});
        }

        return super.queryRecord(...arguments);
    }

    urlForDeleteRecord(id, modelName, snapshot) {
        const url = super.urlForDeleteRecord(...arguments);
        const parsedUrl = new URL(url);

        if (snapshot && snapshot.adapterOptions && snapshot.adapterOptions.cancel) {
            parsedUrl.searchParams.set('cancel', 'true');
        }

        return parsedUrl.toString();
    }
}
