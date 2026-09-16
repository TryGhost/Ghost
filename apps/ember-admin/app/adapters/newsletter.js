import ApplicationAdapter from 'ghost-admin/adapters/application';

export default class Newsletter extends ApplicationAdapter {
    buildIncludeURL(store, modelName, id, snapshot, requestType, query) {
        const url = this.buildURL(modelName, id, snapshot, requestType, query);
        const parsedUrl = new URL(url);

        if (snapshot?.adapterOptions?.optInExisting) {
            parsedUrl.searchParams.append('opt_in_existing', 'true');
        }

        if (snapshot?.adapterOptions?.include) {
            parsedUrl.searchParams.append('include', snapshot?.adapterOptions?.include);
        }

        return parsedUrl.toString();
    }
}
