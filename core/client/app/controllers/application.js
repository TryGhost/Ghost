import Ember from 'ember';

export default Ember.Controller.extend({
    dropdown: Ember.inject.service(),

    // jscs: disable
    signedOut: Ember.computed.match('currentPath', /(signin|signup|setup|reset)/),
    // jscs: enable

    topNotificationCount: 0,
    showMobileMenu: false,
    showSettingsMenu: false,

    autoNav: false,
    autoNavOpen: Ember.computed('autoNav', {
        get () {
            return false;
        },
        set (key, value) {
            if (this.get('autoNav')) {
                return value;
            }
            return false;
        }
    }),

    actions: {
        topNotificationChange (count) {
            this.set('topNotificationCount', count);
        },

        toggleAutoNav () {
            this.toggleProperty('autoNav');
        },

        openAutoNav () {
            this.set('autoNavOpen', true);
        },

        closeAutoNav () {
            this.set('autoNavOpen', false);
        },

        closeMobileMenu () {
            this.set('showMobileMenu', false);
        }
    }
});
