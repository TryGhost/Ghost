export default Ember.Route.extend({
  model: function(params) {
    return ajax("/ghost/api/v0.1/posts/" + params.post_id);
  }
});