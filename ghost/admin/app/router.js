import Router from 'ember-router';
import injectService from 'ember-service/inject';
import on from 'ember-evented/on';
import ghostPaths from 'ghost-admin/utils/ghost-paths';
import documentTitle from 'ghost-admin/utils/document-title';
import config from './config/environment';

const GhostRouter = Router.extend({
    location: config.locationType, // use HTML5 History API instead of hash-tag based URLs
    rootURL: ghostPaths().adminRoot, // admin interface lives under sub-directory /ghost

    notifications: injectService(),

    displayDelayedNotifications: on('didTransition', function () {
        this.get('notifications').displayDelayed();
    })
});

documentTitle();

GhostRouter.map(function () {
    this.route('setup', function () {
        this.route('one');
        this.route('two');
        this.route('three');
    });

    this.route('signin');
    this.route('signout');
    this.route('signup', {path: '/signup/:token'});
    this.route('reset', {path: '/reset/:token'});
    this.route('about', {path: '/about'});

    this.route('posts', {path: '/'}, function () {
        this.route('post', {path: ':post_id'});
    });

    this.route('editor', function () {
        this.route('new', {path: ''});
        this.route('edit', {path: ':post_id'});
    });

    this.route('team', {path: '/team'}, function () {
        this.route('user', {path: ':user_slug'});
    });

    this.route('settings.general', {path: '/settings/general'}, function () {
        this.route('uploadtheme');
    });
    this.route('settings.tags', {path: '/settings/tags'}, function () {
        this.route('tag', {path: ':tag_slug'});
        this.route('new');
    });
    this.route('settings.labs', {path: '/settings/labs'});
    this.route('settings.code-injection', {path: '/settings/code-injection'});
    this.route('settings.navigation', {path: '/settings/navigation'});
    this.route('settings.apps', {path: '/settings/apps'}, function () {
        this.route('slack', {path: 'slack'});
    });

    this.route('subscribers', function() {
        this.route('new');
        this.route('import');
    });

    this.route('error404', {path: '/*path'});
});

export default GhostRouter;
