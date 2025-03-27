import Route from '@ember/routing/route';
import {inject} from 'ghost-admin/decorators/inject';
import {inject as service} from '@ember/service';

export default class DesignsandboxRoute extends Route {
    @service store;

    @inject config;

    beforeModel() {
        super.beforeModel(...arguments);
        if (!this.config.enableDeveloperExperiments) {
            return this.transitionTo('home');
        }
    }

    model() {
        return this.store.queryRecord('post', {limit: 1, order: 'published_at DESC'});
    }
}
