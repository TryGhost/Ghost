import Component from '@ember/component';
import SearchModal from '../modals/search';
import ShortcutsMixin from 'ghost-admin/mixins/shortcuts';
import classic from 'ember-classic-decorator';
import ctrlOrCmd from 'ghost-admin/utils/ctrl-or-cmd';
import {action} from '@ember/object';
import {and, equal, match, or, reads} from '@ember/object/computed';
import {getOwner} from '@ember/application';
import {htmlSafe} from '@ember/template';
import {inject as service} from '@ember/service';
import {tagName} from '@ember-decorators/component';
import {task} from 'ember-concurrency';

@classic
@tagName('')
export default class Main extends Component.extend(ShortcutsMixin) {
    @service billing;
    @service config;
    @service customViews;
    @service feature;
    @service ghostPaths;
    @service modals;
    @service navigation;
    @service router;
    @service session;
    @service ui;
    @service whatsNew;
    @service membersStats;
    @service settings;

    iconStyle = '';
    iconClass = '';
    memberCountLoading = true;
    memberCount = 0;
    shortcuts = null;

    @match('router.currentRouteName', /^settings\.integration/)
        isIntegrationRoute;

    // HACK: {{link-to}} should be doing this automatically but there appears to
    // be a bug in Ember that's preventing it from working immediately after login
    @equal('router.currentRouteName', 'site')
        isOnSite;

    @or('session.user.isAdmin', 'session.user.isEditor')
        showTagsNavigation;

    @and('config.clientExtensions.menu', 'session.user.isOwnerOnly')
        showMenuExtension;

    @and('config.clientExtensions.script', 'session.user.isOwnerOnly')
        showScriptExtension;

    @reads('config.hostSettings.billing.enabled')
        showBilling;

    init() {
        super.init(...arguments);

        let shortcuts = {};

        shortcuts[`${ctrlOrCmd}+k`] = {action: 'openSearchModal'};
        this.shortcuts = shortcuts;
    }

    // the menu has a rendering issue (#8307) when the the world is reloaded
    // during an import which we have worked around by not binding the icon
    // style directly. However we still need to keep track of changing icons
    // so that we can refresh when a new icon is uploaded
    didReceiveAttrs() {
        super.didReceiveAttrs(...arguments);
        this._setIconStyle();
        this._loadMemberCountsTask.perform();
    }

    didInsertElement() {
        super.didInsertElement(...arguments);
        this.registerShortcuts();
    }

    willDestroyElement() {
        this.removeShortcuts();
        super.willDestroyElement(...arguments);
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
    toggleBillingModal() {
        this.billing.openBillingWindow(this.router.currentURL);
    }

    @task(function* () {
        try {
            this.set('memberCountLoading', true);
            const stats = yield this.membersStats.fetchCounts();
            this.set('memberCountLoading', false);
            if (stats) {
                const statsDateObj = this.membersStats.fillCountDates(stats.data) || {};
                const dateValues = Object.values(statsDateObj);
                this.set('memberCount', dateValues.length ? dateValues[dateValues.length - 1].total : 0);
            }
        } catch (e) {
            return false;
        }
    })
        _loadMemberCountsTask;

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
