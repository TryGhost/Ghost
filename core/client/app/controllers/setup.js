import Ember from 'ember';

const {Controller, computed, get, inject} = Ember;
const {match} = computed;

export default Controller.extend({
    appController: inject.controller('application'),
    ghostPaths: inject.service('ghost-paths'),

    showBackLink: match('appController.currentRouteName', /^setup\.(two|three)$/),

    backRoute: computed('appController.currentRouteName', function () {
        let appController = this.get('appController');
        let currentRoute = get(appController, 'currentRouteName');

        return currentRoute === 'setup.two' ? 'setup.one' : 'setup.two';
    })
});
