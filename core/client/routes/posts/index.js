export default Ember.Route.extend({
  // redirect to first post subroute
  redirect: function() {
    var firstPost = (this.modelFor('posts') || []).get('firstObject');

    if (firstPost) {
      this.transitionTo('posts.post', firstPost);
    }
  }
});