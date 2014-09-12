import loadingIndicator from 'ghost/mixins/loading-indicator';

var PostsIndexRoute = Ember.Route.extend(SimpleAuth.AuthenticatedRouteMixin, loadingIndicator, {
    //Transition to posts.post if there are any posts the user can see
    beforeModel: function () {
        var self = this,
        // the store has been populated so we can work with the local copy
            posts = this.store.all('post'),
            post;

        return this.store.find('user', 'me').then(function (user) {
            // return the first post find that matches the following criteria:
            // * User is an author, and is the author of this post
            // * User has a role other than author
            post = posts.find(function (post) {
                if (user.get('isAuthor')) {
                    return post.isAuthoredByUser(user);
                } else {
                    return true;
                }
            });
            if (post) {
                return self.transitionTo('posts.post', post);
            }
        });
    }
});

export default PostsIndexRoute;
