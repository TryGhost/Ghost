import Route from '@ember/routing/route';
import {inject as service} from '@ember/service';

export default Route.extend({
    config: service(),

    beforeModel() {
        this._super(...arguments);
        if (!this.get('config.enableDeveloperExperiments')) {
            return this.transitionTo('home');
        }
    }
});