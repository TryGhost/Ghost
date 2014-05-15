var ApplicationController = Ember.Controller.extend({
    isLoggedIn: Ember.computed.bool('user.isLoggedIn'),
    hideNav: Ember.computed.match('currentPath', /(signin|signup|forgotten|reset)/),

    actions: {
        toggleMenu: function () {
            this.toggleProperty('showMenu');
        }
    }
});

export default ApplicationController;