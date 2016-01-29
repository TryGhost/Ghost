import Ember from 'ember';

const {
    Controller,
    computed,
    inject: {service}
} = Ember;

export default Controller.extend({
    dropdown: service(),

    signedOut: computed.match('currentPath', /(signin|signup|setup|reset)/),

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
