import ApplicationAdapter from 'ghost/adapters/application';

var UserAdapter = ApplicationAdapter.extend({
    find: function (store, type, id) {
        return this.findQuery(store, type, {id: id, status: 'all'});
    }
});

export default UserAdapter;
