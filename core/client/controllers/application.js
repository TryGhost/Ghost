var ApplicationController = Ember.Controller.extend({
    // jscs: disable
    hideNav: Ember.computed.match('currentPath', /(error|signin|signup|setup|forgotten|reset)/),
    // jscs: enable

    topNotificationCount: 0,
    showGlobalMobileNav: false,
    showSettingsMenu: false,

     userImageAlt: Ember.computed('session.user.name', function () {
        var name = this.get('session.user.name');

        return name + '\'s profile picture';
    }),

    actions: {
        topNotificationChange: function (count) {
            this.set('topNotificationCount', count);
        }
    }
});

export default ApplicationController;
