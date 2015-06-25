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
        get: function () {
            return false;
        },
        set: function (key, value) {
            if (this.get('autoNav')) {
                return value;
            }
            return false;
        }
    }),

    actions: {
        topNotificationChange: function (count) {
            this.set('topNotificationCount', count);
        },

        toggleAutoNav: function () {
            this.toggleProperty('autoNav');
        },

        openAutoNav: function () {
            this.set('autoNavOpen', true);
        },

        closeAutoNav: function () {
            this.set('autoNavOpen', false);
        },

        closeMobileMenu: function () {
            this.set('showMobileMenu', false);
        }
    }
});
