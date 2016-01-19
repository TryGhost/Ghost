import Ember from 'ember';
import AuthenticatedRouteMixin from 'ember-simple-auth/mixins/authenticated-route-mixin';
import MobileIndexRoute from 'ghost/routes/mobile-index-route';

const {
    computed,
    inject: {service}
} = Ember;
const {reads} = computed;

export default MobileIndexRoute.extend(AuthenticatedRouteMixin, {
    noPosts: false,

    mediaQueries: service(),
    isMobile: reads('mediaQueries.isMobile'),

    // Transition to a specific post if we're not on mobile
    beforeModel() {
        this._super(...arguments);
        if (!this.get('isMobile')) {
            return this.goToPost();
        }
    },

    setupController(controller) {
        controller.set('noPosts', this.get('noPosts'));
        this._super(...arguments);
    },

    goToPost() {
        // the store has been populated by PostsRoute
        let posts = this.store.peekAll('post');
        let post;

        return this.get('session.user').then((user) => {
            post = posts.find(function (post) {
                // Authors can only see posts they've written
                if (user.get('isAuthor')) {
                    return post.isAuthoredByUser(user);
                }

                return true;
            });

            if (post) {
                return this.transitionTo('posts.post', post);
            }

            this.set('noPosts', true);
        });
    },

    // Mobile posts route callback
    desktopTransition() {
        this.goToPost();
    }
});
