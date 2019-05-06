/* eslint-disable ghost/ember/alias-model-in-controller */
import Controller from '@ember/controller';
import {computed} from '@ember/object';
import {match} from '@ember/object/computed';
import {inject as service} from '@ember/service';

export default Controller.extend({
    ghostPaths: service(),
    router: service(),

    showBackLink: match('router.currentRouteName', /^setup\.(two|three)$/),

    backRoute: computed('router.currentRouteName', function () {
        let currentRoute = this.router.currentRouteName;

        return currentRoute === 'setup.two' ? 'setup.one' : 'setup.two';
    })
});
