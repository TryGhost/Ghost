import ApplicationAdapter from 'ghost/adapters/application';

export default ApplicationAdapter.extend({
    find: function (store, type, id) {
        return this.findQuery(store, type, {id: id, status: 'all'});
    },

    findAll: function (store, type, id) {
        return this.query(store, type, {id: id, status: 'all'});
    }
});
