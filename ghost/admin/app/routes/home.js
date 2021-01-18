import Route from '@ember/routing/route';
import {inject as service} from '@ember/service';

export default class HomeRoute extends Route {
    @service config;

    beforeModel() {
        if (this.config.get('enableDeveloperExperiments')) {
            this.transitionTo('dashboard');
        } else {
            this.transitionTo('site');
        }
    }
}
