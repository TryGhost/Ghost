import Ember from 'ember';

export default Ember.Controller.extend({
    appController: Ember.inject.controller('application'),
    ghostPaths: Ember.inject.service('ghost-paths'),

    showBackLink: Ember.computed.match('appController.currentRouteName', /^setup\.(two|three)$/),

    backRoute: Ember.computed('appController.currentRouteName', function () {
        var appController = this.get('appController'),
            currentRoute = Ember.get(appController, 'currentRouteName');

        return currentRoute === 'setup.two' ? 'setup.one' : 'setup.two';
    })
});
