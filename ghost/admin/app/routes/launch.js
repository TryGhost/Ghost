import AuthenticatedRoute from 'ghost-admin/routes/authenticated';
import {inject as service} from '@ember/service';

export default class LaunchRoute extends AuthenticatedRoute {
    @service config;

    beforeModel() {
        if (!this.config.get('enableDeveloperExperiments')) {
            this.transitionTo('site');
        }
    }
}
