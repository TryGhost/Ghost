import Component from '@ember/component';
import SearchModal from '../modals/search';
import ShortcutsMixin from 'ghost-admin/mixins/shortcuts';
import classic from 'ember-classic-decorator';
import ctrlOrCmd from 'ghost-admin/utils/ctrl-or-cmd';
import {action} from '@ember/object';
import {and, equal, match, or, reads} from '@ember/object/computed';
import {getOwner} from '@ember/application';
import {htmlSafe} from '@ember/template';
import {inject} from 'ghost-admin/decorators/inject';
import {inject as service} from '@ember/service';
import {tagName} from '@ember-decorators/component';

@classic
@tagName('')
export default class Main extends Component.extend(ShortcutsMixin) {
    @service billing;
    @service customViews;
    @service feature;
    @service ghostPaths;
    @service modals;
    @service navigation;
    @service router;
    @service session;
    @service ui;
    @service membersStats;
    @service settings;
    @service explore;
    @service notifications;
    @service notificationsCount;

    @inject config;

    iconStyle = '';
    iconClass = '';
    shortcuts = null;
    previousRoute = null;

    @match('router.currentRouteName', /^settings\.integration/)
        isIntegrationRoute;

    // HACK: {{link-to}} should be doing this automatically but there appears to
    // be a bug in Ember that's preventing it from working immediately after login
    @equal('router.currentRouteName', 'site')
        isOnSite;

    @or('session.user.isAdmin', 'session.user.isEitherEditor')
        showTagsNavigation;

    @and('config.clientExtensions.menu', 'session.user.isOwnerOnly')
        showMenuExtension;

    @reads('config.hostSettings.billing.enabled')
        showBilling;

    init() {
        super.init(...arguments);

        let shortcuts = {};

        shortcuts[`${ctrlOrCmd}+k`] = {action: 'openSearchModal'};
        shortcuts[`${ctrlOrCmd}+,`] = {action: 'openSettings'};
        this.shortcuts = shortcuts;

        // Set initial previous route
        this.previousRoute = this.router.currentRouteName;

        const currentRoute = this.router.currentRouteName || '';
        // Fetch notifications count if not on activitypub-x route
        if (this.settings.socialWebEnabled && !currentRoute.startsWith('activitypub-x')) {
            this.notificationsCount.fetchCount();
        }

        this._routeChangeHandler = () => {
            const current = this.router.currentRouteName || '';
            const prev = this.previousRoute || '';

            if (this.settings.socialWebEnabled && prev.startsWith('activitypub-x') && !current.startsWith('activitypub-x')) {
                this.notificationsCount.fetchCount();
            }

            this.previousRoute = current;
        };

        this.router.on('routeDidChange', this._routeChangeHandler);
    }

    // the menu has a rendering issue (#8307) when the the world is reloaded
    // during an import which we have worked around by not binding the icon
    // style directly. However we still need to keep track of changing icons
    // so that we can refresh when a new icon is uploaded
    didReceiveAttrs() {
        super.didReceiveAttrs(...arguments);
        this._setIconStyle();
    }

    didInsertElement() {
        super.didInsertElement(...arguments);
        this.registerShortcuts();
    }

    willDestroyElement() {
        this.removeShortcuts();
        super.willDestroyElement(...arguments);
        if (this._routeChangeHandler) {
            this.router.off('routeDidChange', this._routeChangeHandler);
        }
    }

    @action
    transitionToOrRefreshSite() {
        let {currentRouteName} = this.router;
        if (currentRouteName === 'site') {
            getOwner(this).lookup(`route:${currentRouteName}`).refresh();
        } else {
            if (this.session.user.isContributor) {
                this.router.transitionTo('posts');
            } else {
                this.router.transitionTo('site');
            }
        }
    }

    @action
    openSearchModal() {
        return this.modals.open(SearchModal);
    }

    @action
    openSettings() {
        this.router.transitionTo('settings-x');
    }

    @action
    toggleBillingModal() {
        this.billing.openBillingWindow(this.router.currentURL);
    }

    @action
    toggleExploreWindow() {
        this.explore.openExploreWindow();
    }

    _setIconStyle() {
        let icon = this.icon;

        if (icon === this._icon) {
            return;
        }

        this._icon = icon;

        if (icon && icon.match(/^https?:\/\//i)) {
            this.set('iconClass', '');
            this.set('iconStyle', htmlSafe(`background-image: url(${icon})`));
            return;
        }

        let iconUrl = 'https://static.ghost.org/v4.0.0/images/ghost-orb-1.png';

        this.set('iconStyle', htmlSafe(`background-image: url(${iconUrl})`));
        this.set('iconClass', 'gh-nav-logo-default');
    }
}
