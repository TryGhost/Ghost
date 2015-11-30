import Ember from 'ember';
import AuthenticatedRouteMixin from 'ember-simple-auth/mixins/authenticated-route-mixin';
import MobileIndexRoute from 'ghost/routes/mobile-index-route';

export default MobileIndexRoute.extend(AuthenticatedRouteMixin, {
    noPosts: false,

    mediaQueries: Ember.inject.service(),
    isMobile: Ember.computed.reads('mediaQueries.isMobile'),

    // Transition to a specific post if we're not on mobile
    beforeModel: function () {
        if (!this.get('isMobile')) {
            return this.goToPost();
        }
    },

    setupController: function (controller) {
        controller.set('noPosts', this.get('noPosts'));
    },

    goToPost: function () {
        var self = this,
            // the store has been populated by PostsRoute
            posts = this.store.peekAll('post'),
            post;

        return this.get('session.user').then(function (user) {
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
