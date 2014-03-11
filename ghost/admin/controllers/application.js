var ApplicationController = Ember.Controller.extend({
    isLogin: Ember.computed.equal('currentPath', 'login')
});

export default ApplicationController;