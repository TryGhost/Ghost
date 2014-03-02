export default Ember.Route.extend({
  // redirect to first post subroute
  redirect: function() {
    var firstPost = this.modelFor('posts').posts[0];

    if (firstPost) {
      this.transitionTo('post', firstPost);
    }
  }
});