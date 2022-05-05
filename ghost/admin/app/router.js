import EmberRouter from '@ember/routing/router';
import config from 'ghost-admin/config/environment';
import ghostPaths from 'ghost-admin/utils/ghost-paths';

const Router = EmberRouter.extend({
    location: config.locationType, // use HTML5 History API instead of hash-tag based URLs
    rootURL: ghostPaths().adminRoot // admin interface lives under sub-directory /ghost
});

Router.map(function () {
    this.route('home', {path: '/'});

    this.route('setup');
    this.route('setup.done', {path: '/setup/done'});

    this.route('signin');
    this.route('signout');
    this.route('signup', {path: '/signup/:token'});
    this.route('reset', {path: '/reset/:token'});

    this.route('whatsnew');
    this.route('site');
    this.route('dashboard');
    this.route('launch');

    this.route('pro', function () {
        this.route('pro-sub', {path: '/*sub'});
    });

    this.route('posts');
    this.route('pages');

    this.route('editor', function () {
        this.route('new', {path: ':type'});
        this.route('edit', {path: ':type/:post_id'});
    });

    this.route('tags');
    this.route('tag.new', {path: '/tags/new'});
    this.route('tag', {path: '/tags/:tag_slug'});

    this.route('settings');
    this.route('settings.general', {path: '/settings/general'});
    this.route('settings.membership', {path: '/settings/members'});
    this.route('settings.code-injection', {path: '/settings/code-injection'});
    
    // redirect from old /settings/members-email to /settings/newsletters
    this.route('settings.members-email', {path: '/settings/members-email'});
    this.route('settings.newsletters', {path: '/settings/newsletters'}, function () {
        this.route('new-newsletter', {path: 'new'});
        this.route('edit-newsletter', {path: ':newsletter_id'});
    });

    this.route('settings.design', {path: '/settings/design'}, function () {
        this.route('change-theme', function () {
            this.route('view', {path: ':theme_name'});
            this.route('install');
        });
    });
    // redirect for old install route used by ghost.org/marketplace
    this.route('settings.theme-install', {path: '/settings/theme/install'});

    this.route('settings.staff', {path: '/settings/staff'}, function () {
        this.route('user', {path: ':user_slug'});
    });

    this.route('settings.integrations', {path: '/settings/integrations'}, function () {
        this.route('new');
    });
    this.route('settings.integration', {path: '/settings/integrations/:integration_id'}, function () {
        this.route('webhooks.new', {path: 'webhooks/new'});
        this.route('webhooks.edit', {path: 'webhooks/:webhook_id'});
    });
    this.route('settings.integrations.slack', {path: '/settings/integrations/slack'});
    this.route('settings.integrations.amp', {path: '/settings/integrations/amp'});
    this.route('settings.integrations.firstpromoter', {path: '/settings/integrations/firstpromoter'});
    this.route('settings.integrations.unsplash', {path: '/settings/integrations/unsplash'});
    this.route('settings.integrations.zapier', {path: '/settings/integrations/zapier'});

    this.route('settings.navigation', {path: '/settings/navigation'});
    this.route('settings.labs', {path: '/settings/labs'});

    this.route('members', function () {
        this.route('import');
    });
    this.route('member.new', {path: '/members/new'});
    this.route('member', {path: '/members/:member_id'});
    this.route('members-activity');

    this.route('offers');

    this.route('offer.new', {path: '/offers/new'});
    this.route('offer', {path: '/offers/:offer_id'});

    this.route('error404', {path: '/*path'});

    this.route('designsandbox');
});

export default Router;
