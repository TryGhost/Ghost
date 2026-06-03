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

    urlForCreateRecord(modelName, snapshot) {
        let url = super.urlForCreateRecord(...arguments);

        if (snapshot && snapshot.adapterOptions && snapshot.adapterOptions.sendWelcomeEmail) {
            let parsedUrl = new URL(url);
            parsedUrl.searchParams.set('send_welcome_email', 'true');
            return parsedUrl.toString();
        }

        return url;
    }
}
