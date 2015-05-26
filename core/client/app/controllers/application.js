import Ember from 'ember';

export default Ember.Controller.extend({
    dropdown: Ember.inject.service(),

    // jscs: disable
    signedOut: Ember.computed.match('currentPath', /(signin|signup|setup|reset)/),
    // jscs: enable

    topNotificationCount: 0,
    showNavMenu: false,
    showSettingsMenu: false,

    autoNav: false,

    actions: {
        topNotificationChange: function (count) {
            this.set('topNotificationCount', count);
        },

        closeNavMenu: function () {
            this.get('dropdown').closeDropdowns();
            this.set('showNavMenu', false);
        },

        navMenuToggleMaximise: function () {
            this.toggleProperty('autoNav');
        }
    }
});
