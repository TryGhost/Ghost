import loadingIndicator from 'ghost/mixins/loading-indicator';

var PostsIndexRoute = Ember.Route.extend(SimpleAuth.AuthenticatedRouteMixin, loadingIndicator, {
    // This route's only function is to determine whether or not a post
    // exists to be used for the content preview.  It has a parent resource (Posts)
    // that is responsible for populating the store.
    beforeModel: function () {
        var self = this,
        // the store has been populated so we can work with the local copy
            posts = this.store.all('post');

        return this.store.find('user', 'me').then(function (user) {
            // return the first post find that matches the following criteria:
            // * User is an author, and is the author of this post
            // * User has a role other than author
            return posts.find(function (post) {
                if (user.get('isAuthor')) {
                    return post.isAuthoredByUser(user);
                } else {
                    return true;
                }
            });
        })
        .then(function (post) {
            if (post) {
                return self.transitionTo('posts.post', post);
            }
        });
    }
});

export default PostsIndexRoute;
