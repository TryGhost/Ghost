var ApplicationController = Ember.Controller.extend({
    isLoggedIn: Ember.computed.bool('user.isLoggedIn'),
    actions: {
        toggleMenu: function () {
            this.toggleProperty('showMenu');
        }
    }
});

export default ApplicationController;