/*global Ember */
import ghostPaths from 'ghost/utils/ghost-paths';

// ensure we don't share routes between all Router instances
var Router = Ember.Router.extend();

Router.reopen({
    location: 'trailing-history', // use HTML5 History API instead of hash-tag based URLs
    rootURL: ghostPaths().subdir + '/ghost/', // admin interface lives under sub-directory /ghost

    clearNotifications: function () {
        this.notifications.closePassive();
        this.notifications.displayDelayed();
    }.on('didTransition')
});

Router.map(function () {
    this.route('setup');
    this.route('signin');
    this.route('signout');
    this.route('signup', { path: '/signup/:token' });
    this.route('forgotten');
    this.route('reset', { path: '/reset/:token' });
    this.resource('posts', { path: '/' }, function () {
        this.route('post', { path: ':post_id' });
    });
    this.resource('editor', function () {
        this.route('new', { path: '' });
        this.route('edit', { path: ':post_id' });
    });
    this.resource('settings', function () {
        this.route('general');
        this.resource('settings.users', { path: '/users' }, function () {
            this.route('user', { path: '/:slug' });
        });
        this.route('apps');
    });
    this.route('debug');
    //Redirect legacy content to posts
    this.route('content');

    this.route('error404', { path: '/*path' });

});

export default Router;
