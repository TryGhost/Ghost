import MobileIndexRoute from 'ghost/routes/mobile-index-route';
import loadingIndicator from 'ghost/mixins/loading-indicator';
import mobileQuery from 'ghost/utils/mobile';

var PostsIndexRoute = MobileIndexRoute.extend(SimpleAuth.AuthenticatedRouteMixin, loadingIndicator, {
    noPosts: false,

    // Transition to a specific post if we're not on mobile
    beforeModel: function () {
        if (!mobileQuery.matches) {
            return this.goToPost();
        }
    },

    setupController: function (controller, model) {
        /*jshint unused:false*/
        controller.set('noPosts', this.get('noPosts'));
    },

    goToPost: function () {
        var self = this,
            // the store has been populated by PostsRoute
            posts = this.store.all('post'),
            post;

        return this.store.find('user', 'me').then(function (user) {
            post = posts.find(function (post) {
                // Authors can only see posts they've written
                if (user.get('isAuthor')) {
                    return post.isAuthoredByUser(user);
                }

                return true;
            });

            if (post) {
                return self.transitionTo('posts.post', post);
            }

            self.set('noPosts', true);
        });
    },

    // Mobile posts route callback
    desktopTransition: function () {
        this.goToPost();
    }
});

export default PostsIndexRoute;
