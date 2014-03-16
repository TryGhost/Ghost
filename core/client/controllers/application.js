var ApplicationController = Ember.Controller.extend({
    isLoggedOut: Ember.computed.match('currentPath', /(signin|signup|forgotten|reset)/)
});

export default ApplicationController;