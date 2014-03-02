export default Ember.Route.extend({
  model: function(params) {
    var posts = this.modelFor('posts').posts,
	id = parseInt(params.post_id);

    return posts.findBy('id', id);

    // model already loaded in parent route => no ajax call to server
    // return ajax("/ghost/api/v0.1/posts/" + params.post_id);
  }
});