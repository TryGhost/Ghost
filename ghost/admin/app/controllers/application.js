import Controller from 'ember-controller';
import computed from 'ember-computed';
import injectService from 'ember-service/inject';

export default Controller.extend({
    dropdown: injectService(),
    session: injectService(),

    showNavMenu: computed('currentPath', 'session.isAuthenticated', function () {
        return (this.get('currentPath') !== 'error404' || this.get('session.isAuthenticated')) &&
            !this.get('currentPath').match(/(signin|signup|setup|reset)/);
    }),

    topNotificationCount: 0,
    showMobileMenu: false,
    showSettingsMenu: false,
    showMarkdownHelpModal: false,

    autoNav: false,
    autoNavOpen: computed('autoNav', {
        get() {
            return false;
        },
        set(key, value) {
            if (this.get('autoNav')) {
                return value;
            }
            return false;
        }
    }),

    actions: {
        topNotificationChange(count) {
            this.set('topNotificationCount', count);
        },

        toggleAutoNav() {
            this.toggleProperty('autoNav');
        },

        openAutoNav() {
            this.set('autoNavOpen', true);
        },

        closeAutoNav() {
            this.set('autoNavOpen', false);
        },

        closeMobileMenu() {
            this.set('showMobileMenu', false);
        }
    }
});
