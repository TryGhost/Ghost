var ApplicationController = Ember.Controller.extend({
    hideNav: Ember.computed.match('currentPath', /(signin|signup|setup|forgotten|reset)/),

    topNotificationCount: 0,

    actions: {
        toggleMenu: function () {
            this.toggleProperty('showMenu');
        },

        topNotificationChange: function (count) {
            this.set('topNotificationCount', count);
        }
    }
});

export default ApplicationController;
