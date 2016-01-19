import Ember from 'ember';

const {
    Controller,
    computed,
    get,
    inject: {service, controller}
} = Ember;
const {match} = computed;

export default Controller.extend({
    appController: controller('application'),
    ghostPaths: service(),

    showBackLink: match('appController.currentRouteName', /^setup\.(two|three)$/),

    backRoute: computed('appController.currentRouteName', function () {
        let appController = this.get('appController');
        let currentRoute = get(appController, 'currentRouteName');

        return currentRoute === 'setup.two' ? 'setup.one' : 'setup.two';
    })
});
