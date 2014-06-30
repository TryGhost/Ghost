var ApplicationController = Ember.Controller.extend({
    hideNav: Ember.computed.match('currentPath', /(signin|signup|setup|forgotten|reset)/),

    actions: {
        toggleMenu: function () {
            this.toggleProperty('showMenu');
        }
    }
});

export default ApplicationController;