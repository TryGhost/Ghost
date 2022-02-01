import classic from 'ember-classic-decorator';
import {computed} from '@ember/object';
import {match} from '@ember/object/computed';
import {inject as service} from '@ember/service';
/* eslint-disable ghost/ember/alias-model-in-controller */
import Controller from '@ember/controller';

@classic
export default class SetupController extends Controller {
    @service
    ghostPaths;

    @service
    router;

    @match('router.currentRouteName', /^setup\.(two|three)$/)
    showBackLink;

    @computed('router.currentRouteName')
    get backRoute() {
        let currentRoute = this.router.currentRouteName;

        return currentRoute === 'setup.two' ? 'setup.one' : 'setup.two';
    }
}
