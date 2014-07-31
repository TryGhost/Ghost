import loadingIndicator from 'ghost/mixins/loading-indicator';

var PostsIndexRoute = Ember.Route.extend(SimpleAuth.AuthenticatedRouteMixin, loadingIndicator, {
    // This route's only function is to determine whether or not a post
    // exists to be used for the content preview.  It has a parent resource (Posts)
    // that is responsible for populating the store.
    beforeModel: function () {
        var self = this,
        // the store has been populated so we can work with the local copy
            post = this.store.all('post').get('firstObject');

        if (post) {
            return this.store.find('user', 'me').then(function (user) {
                if (user.get('isAuthor') && post.isAuthoredByUser(user)) {
                    // do not show the post if they are an author but not this posts author
                    return;
                }

                return self.transitionTo('posts.post', post);
            });
        }
    }
});

export default PostsIndexRoute;