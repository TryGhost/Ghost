import Controller from 'ember-controller';
import computed, {match} from 'ember-computed';
import injectService from 'ember-service/inject';
import injectController from 'ember-controller/inject';

export default Controller.extend({
    appController: injectController('application'),
    ghostPaths: injectService(),

    showBackLink: match('appController.currentRouteName', /^setup\.(two|three)$/),

    backRoute: computed('appController.currentRouteName', function () {
        let currentRoute = this.get('appController.currentRouteName');

        return currentRoute === 'setup.two' ? 'setup.one' : 'setup.two';
    })
});
