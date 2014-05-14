var ApplicationController = Ember.Controller.extend({
    isSignedIn: Ember.computed.bool('user.isSignedIn'),

    actions: {
        toggleMenu: function () {
            this.toggleProperty('showMenu');
        }
    }
});

export default ApplicationController;