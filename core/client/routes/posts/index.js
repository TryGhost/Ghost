import loadingIndicator from 'ghost/mixins/loading-indicator';

var PostsIndexRoute = Ember.Route.extend(Ember.SimpleAuth.AuthenticatedRouteMixin, loadingIndicator, {
    // This route's only function is to determine whether or not a post
    // exists to be used for the content preview.  It has a parent resource (Posts)
    // that is responsible for populating the store.
    beforeModel: function () {
        // the store has been populated so we can work with the local copy
        var post = this.store.all('post').get('firstObject');

        if (post) {
            return this.transitionTo('posts.post', post);
        }
    }
});

export default PostsIndexRoute;
