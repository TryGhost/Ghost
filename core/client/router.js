/*global Ember */

// ensure we don't share routes between all Router instances
var Router = Ember.Router.extend();

Router.reopen({
  //location: 'history', // use HTML5 History API instead of hash-tag based URLs
  rootURL: '/ghost/ember/' // admin interface lives under sub-directory /ghost
});

Router.map(function () {
  this.resource('posts', { path: '/' }, function () {
    this.resource('post', { path: '/:post_id' });
  });
  this.resource('editor', { path: '/editor/:post_id' });
  this.route('new', { path: '/editor' });
});

export default Router;
