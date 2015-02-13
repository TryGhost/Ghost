import ghostPaths from 'ghost/utils/ghost-paths';
import documentTitle from 'ghost/utils/document-title';

var Router = Ember.Router.extend({
    location: 'trailing-history', // use HTML5 History API instead of hash-tag based URLs
    rootURL: ghostPaths().adminRoot, // admin interface lives under sub-directory /ghost

    clearNotifications: Ember.on('didTransition', function () {
        this.notifications.closePassive();
        this.notifications.displayDelayed();
    })
});

documentTitle();

Router.map(function () {
    this.route('setup');
    this.route('signin');
    this.route('signout');
    this.route('signup', {path: '/signup/:token'});
    this.route('forgotten');
    this.route('reset', {path: '/reset/:token'});

    this.resource('posts', {path: '/'}, function () {
        this.route('post', {path: ':post_id'});
    });

    this.resource('editor', function () {
        this.route('new', {path: ''});
        this.route('edit', {path: ':post_id'});
    });

    this.resource('settings', function () {
        this.route('general');

        this.resource('settings.users', {path: '/users'}, function () {
            this.route('user', {path: '/:slug'});
        });

        this.route('about');
        this.route('tags');
        this.route('labs');
        this.route('code-injection');
        this.route('navigation');
    });

    // Redirect debug to settings labs
    this.route('debug');

    // Redirect legacy content to posts
    this.route('content');

    this.route('error404', {path: '/*path'});
});

export default Router;
