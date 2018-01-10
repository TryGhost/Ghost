/* eslint-disable ghost/ember/alias-model-in-controller */
import Controller, {inject as controller} from '@ember/controller';
import {computed} from '@ember/object';
import {match} from '@ember/object/computed';
import {inject as service} from '@ember/service';

export default Controller.extend({
    appController: controller('application'),
    ghostPaths: service(),

    showBackLink: match('appController.currentRouteName', /^setup\.(two|three)$/),

    backRoute: computed('appController.currentRouteName', function () {
        let currentRoute = this.get('appController.currentRouteName');

        return currentRoute === 'setup.two' ? 'setup.one' : 'setup.two';
    })
});
