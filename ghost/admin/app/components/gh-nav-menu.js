import Component from '@ember/component';
import ShortcutsMixin from 'ghost-admin/mixins/shortcuts';
import calculatePosition from 'ember-basic-dropdown/utils/calculate-position';
import ctrlOrCmd from 'ghost-admin/utils/ctrl-or-cmd';
import {and, equal, match} from '@ember/object/computed';
import {getOwner} from '@ember/application';
import {htmlSafe} from '@ember/string';
import {inject as service} from '@ember/service';

export default Component.extend(ShortcutsMixin, {
    config: service(),
    feature: service(),
    ghostPaths: service(),
    router: service(),
    session: service(),
    ui: service(),
    whatsNew: service(),

    tagName: 'nav',
    classNames: ['gh-nav'],

    iconStyle: '',

    showSearchModal: false,

    shortcuts: null,

    isIntegrationRoute: match('router.currentRouteName', /^settings\.integration/),
    isSettingsRoute: match('router.currentRouteName', /^settings/),

    // HACK: {{link-to}} should be doing this automatically but there appears to
    // be a bug in Ember that's preventing it from working immediately after login
    isOnSite: equal('router.currentRouteName', 'site'),

    showMenuExtension: and('config.clientExtensions.menu', 'session.user.isOwner'),
    showDropdownExtension: and('config.clientExtensions.dropdown', 'session.user.isOwner'),
    showScriptExtension: and('config.clientExtensions.script', 'session.user.isOwner'),

    init() {
        this._super(...arguments);

        let shortcuts = {};

        shortcuts[`${ctrlOrCmd}+k`] = {action: 'toggleSearchModal'};
        this.shortcuts = shortcuts;
    },

    // the menu has a rendering issue (#8307) when the the world is reloaded
    // during an import which we have worked around by not binding the icon
    // style directly. However we still need to keep track of changing icons
    // so that we can refresh when a new icon is uploaded
    didReceiveAttrs() {
        this._setIconStyle();
    },

    didInsertElement() {
        this._super(...arguments);
        this.registerShortcuts();
    },

    willDestroyElement() {
        this.removeShortcuts();
        this._super(...arguments);
    },

    actions: {
        transitionToOrRefreshSite() {
            let {currentRouteName} = this.router;
            if (currentRouteName === 'site') {
                getOwner(this).lookup(`route:${currentRouteName}`).refresh();
            } else {
                this.router.transitionTo('site');
            }
        },
        toggleSearchModal() {
            this.toggleProperty('showSearchModal');
        }
    },

    // equivalent to "left: auto; right: -20px"
    userDropdownPosition(trigger, dropdown) {
        let {horizontalPosition, verticalPosition, style} = calculatePosition(...arguments);
        let {width: dropdownWidth} = dropdown.firstElementChild.getBoundingClientRect();

        style.right += (dropdownWidth - 20);
        style['z-index'] = 1100;

        return {horizontalPosition, verticalPosition, style};
    },

    _setIconStyle() {
        let icon = this.icon;

        if (icon === this._icon) {
            return;
        }

        this._icon = icon;

        if (icon && icon.match(/^https?:\/\//i)) {
            this.set('iconStyle', htmlSafe(`background-image: url(${icon})`));
            return;
        }

        let subdirRegExp = new RegExp(`^${this.get('ghostPaths.subdir')}`);
        let blogIcon = icon ? icon : 'favicon.ico';
        let iconUrl;

        blogIcon = blogIcon.replace(subdirRegExp, '');

        iconUrl = this.get('ghostPaths.url').join(this.get('config.blogUrl'), blogIcon).replace(/\/$/, '');
        iconUrl += `?t=${(new Date()).valueOf()}`;

        this.set('iconStyle', htmlSafe(`background-image: url(${iconUrl})`));
    }
});
