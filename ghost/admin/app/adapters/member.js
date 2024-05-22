import ApplicationAdapter from 'ghost-admin/adapters/application';

export default class Member extends ApplicationAdapter {
    queryRecord(store, type, query) {
        if (query && query.id) {
            let {id} = query;
            delete query.id;
            let url = this.buildURL(type.modelName, id, query, 'findRecord');
            return this.ajax(url, 'GET', {data: query});
        }

        return super.queryRecord(...arguments);
    }

    urlForDeleteRecord(id, modelName, snapshot) {
        let url = super.urlForDeleteRecord(...arguments);
        let parsedUrl = new URL(url);

        if (snapshot && snapshot.adapterOptions && snapshot.adapterOptions.cancel) {
            parsedUrl.searchParams.set('cancel', 'true');
        }

        return parsedUrl.toString();
    }
}
