var ApplicationController = Ember.Controller.extend({
    isSignedIn: Ember.computed.bool('user.isSignedIn'),
    hideNav: Ember.computed.match('currentPath', /(signin|signup|forgotten|reset)/),

    actions: {
        toggleMenu: function () {
            this.toggleProperty('showMenu');
        }
    }
});

export default ApplicationController;