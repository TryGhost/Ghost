import Controller from '@ember/controller';
import {computed} from '@ember/object';
import {inject as injectController} from '@ember/controller';
import {inject as injectService} from '@ember/service';
import {match} from '@ember/object/computed';

export default Controller.extend({
    appController: injectController('application'),
    ghostPaths: injectService(),

    showBackLink: match('appController.currentRouteName', /^setup\.(two|three)$/),

    backRoute: computed('appController.currentRouteName', function () {
        let currentRoute = this.get('appController.currentRouteName');

        return currentRoute === 'setup.two' ? 'setup.one' : 'setup.two';
    })
});
