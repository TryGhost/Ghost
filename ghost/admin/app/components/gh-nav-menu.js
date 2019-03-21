import Component from '@ember/component';
import calculatePosition from 'ember-basic-dropdown/utils/calculate-position';
import {computed} from '@ember/object';
import {getOwner} from '@ember/application';
import {htmlSafe} from '@ember/string';
import {inject as service} from '@ember/service';

export default Component.extend({
    config: service(),
    feature: service(),
    ghostPaths: service(),
    router: service(),
    session: service(),
    ui: service(),

    tagName: 'nav',
    classNames: ['gh-nav'],

    iconStyle: '',

    showMenuExtension: computed('config.clientExtensions.menu', 'session.user.isOwner', function () {
        return this.get('config.clientExtensions.menu') && this.get('session.user.isOwner');
    }),

    showDropdownExtension: computed('config.clientExtensions.dropdown', 'session.user.isOwner', function () {
        return this.get('config.clientExtensions.dropdown') && this.get('session.user.isOwner');
    }),

    showScriptExtension: computed('config.clientExtensions.script', 'session.user.isOwner', function () {
        return this.get('config.clientExtensions.script') && this.get('session.user.isOwner');
    }),

    isIntegrationRoute: computed('router.currentRouteName', function () {
        let re = /^settings\.integration/;
        return re.test(this.router.currentRouteName);
    }),

    // HACK: {{link-to}} should be doing this automatically but there appears to
    // be a bug in Ember that's preventing it from working immediately after login
    isOnSite: computed('router.currentRouteName', function () {
        return this.router.currentRouteName === 'site';
    }),

    // the menu has a rendering issue (#8307) when the the world is reloaded
    // during an import which we have worked around by not binding the icon
    // style directly. However we still need to keep track of changing icons
    // so that we can refresh when a new icon is uploaded
    didReceiveAttrs() {
        this._setIconStyle();
    },

    actions: {
        transitionToOrRefreshSite() {
            let {currentRouteName} = this.router;
            if (currentRouteName === 'site') {
                getOwner(this).lookup(`route:${currentRouteName}`).refresh();
            } else {
                this.router.transitionTo('site');
            }
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
