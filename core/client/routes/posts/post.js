export default Ember.Route.extend({
    model: function (params) {
        return this.store.find('post', params.post_id);
    }
});
