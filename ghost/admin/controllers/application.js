var ApplicationController = Ember.Controller.extend({
    isLoggedOut: Ember.computed.match('currentPath', /(signin|signup|forgotten|reset)/),
    actions: {
        toggleMenu: function () {
            this.toggleProperty('showMenu');
        }
    }
});

export default ApplicationController;