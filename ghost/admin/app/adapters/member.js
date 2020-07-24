import ApplicationAdapter from 'ghost-admin/adapters/application';

export default ApplicationAdapter.extend({
    urlForDeleteRecord(id, modelName, snapshot) {
        let url = this._super(...arguments);
        let parsedUrl = new URL(url);

        if (snapshot && snapshot.adapterOptions && snapshot.adapterOptions.cancel) {
            parsedUrl.searchParams.set('cancel', 'true');
        }

        return parsedUrl.toString();
    }
});
