import ApplicationAdapter from 'ghost/adapters/application';

export default ApplicationAdapter.extend({
    find: function (store, type, id) {
        return this.findQuery(store, type, {id: id, status: 'all'});
    },

    // TODO: This is needed because the API currently expects you to know the
    // status of the record before retrieving by ID. Quick fix is to always
    // include status=all in the query
    findRecord: function (store, type, id, snapshot) {
        let url = this.buildIncludeURL(store, type.modelName, id, snapshot, 'findRecord');

        url += '&status=all';

        return this.ajax(url, 'GET');
    },

    findAll: function (store, type, id) {
        return this.query(store, type, {id: id, status: 'all'});
    }
});
