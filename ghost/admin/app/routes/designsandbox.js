import Route from '@ember/routing/route';
import {inject as service} from '@ember/service';

export default class DesignsandboxRoute extends Route {
    @service config;
    @service store;

    beforeModel() {
        super.beforeModel(...arguments);
        if (!this.config.get('enableDeveloperExperiments')) {
            return this.transitionTo('home');
        }
    }

    model() {
        return this.store.queryRecord('post', {limit: 1, order: 'published_at DESC'});
    }
}
