import EmberRouter from '@ember/routing/router';
import config from 'ghost-admin/config/environment';
import ghostPaths from 'ghost-admin/utils/ghost-paths';

const Router = EmberRouter.extend({
    location: config.locationType, // use HTML5 History API instead of hash-tag based URLs
    rootURL: ghostPaths().adminRoot // admin interface lives under sub-directory /ghost
});

// eslint-disable-next-line array-callback-return
Router.map(function () {
    this.route('home', {path: '/'});

    this.route('setup');
    this.route('setup.done', {path: '/setup/done'});

    this.route('signin');
    this.route('signin-verify', {path: '/signin/verify'});
    this.route('signout');
    this.route('signup', {path: '/signup/:token'});
    this.route('reset', {path: '/reset/:token'});

    this.route('whatsnew');
    this.route('site');
    this.route('dashboard');
    this.route('launch');
    this.route('stats');

    this.route('pro', function () {
        this.route('pro-sub', {path: '/*sub'});
    });

    this.route('posts');
    this.route('posts.analytics', {path: '/posts/analytics/:post_id'});
    this.route('posts.mentions', {path: '/posts/analytics/:post_id/mentions'});
    this.route('posts.debug', {path: '/posts/analytics/:post_id/debug'});

    this.route('restore-posts', {path: '/restore'});

    this.route('pages');

    this.route('lexical-editor', {path: 'editor'}, function () {
        this.route('new', {path: ':type'});
        this.route('edit', {path: ':type/:post_id'});
    });

    this.route('tags');
    this.route('tag.new', {path: '/tags/new'});
    this.route('tag', {path: '/tags/:tag_slug'});

    this.route('collections');
    this.route('collection.new', {path: '/collections/new'});
    this.route('collection', {path: '/collections/:collection_slug'});

    this.route('demo-x', function () {
        this.route('demo-x', {path: '/*sub'});
    });

    this.route('settings-x', {path: '/settings'}, function () {
        this.route('settings-x', {path: '/*sub'});
    });

    this.route('activitypub-x',{path: '/activitypub'}, function () {
        this.route('activitypub-x', {path: '/*sub'});
    });

    this.route('explore', function () {
        // actual Ember route, not rendered in iframe
        this.route('connect');
        // iframe sub pages, used for categories
        this.route('explore-sub', {path: '/*sub'}, function () {
            // needed to allow search to work, as it uses URL
            // params for search queries. They don't need to
            // be visible, but may not be cut off.
            this.route('explore-query', {path: '/*query'});
        });
    });

    this.route('migrate', function () {
        this.route('migrate', {path: '/*platform'});
    });

    this.route('members', function () {
        this.route('import');
    });
    this.route('member.new', {path: '/members/new'});
    this.route('member', {path: '/members/:member_id'});
    this.route('members-activity');

    // this.route('offers');

    // this.route('offer.new', {path: '/offers/new'});
    // this.route('offer', {path: '/offers/:offer_id'});

    this.route('error404', {path: '/*path'});

    this.route('designsandbox');

    this.route('mentions');
});

export default Router;
