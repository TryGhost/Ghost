import Controller from '@ember/controller';
import {inject} from 'ghost-admin/decorators/inject';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';

export default class IntegrationsController extends Controller {
    @service settings;
    @service store;

    @inject config;

    _allIntegrations = this.store.peekAll('integration');

    get zapierDisabled() {
        return this.config.hostSettings?.limits?.customIntegrations?.disabled;
    }

    // filter over the live query so that the list is automatically updated
    // as integrations are added/removed
    get integrations() {
        return this._allIntegrations.reject((integration) => {
            return integration.isNew || integration.type !== 'custom';
        });
    }

    // use ember-concurrency so that we can use the derived state to show
    // a spinner only in the integrations list and avoid delaying the whole
    // screen display
    @task
    *fetchIntegrations() {
        return yield this.store.findAll('integration');
    }

    // used by individual integration routes' `model` hooks
    integrationModelHook(prop, value, route, transition) {
        let preloadedIntegration = this.store.peekAll('integration').findBy(prop, value);

        if (preloadedIntegration) {
            return preloadedIntegration;
        }

        return this.fetchIntegrations.perform().then((integrations) => {
            let integration = integrations.findBy(prop, value);

            if (!integration) {
                let path = transition.intent.url.replace(/^\//, '');
                return route.replaceWith('error404', {path, status: 404});
            }

            return integration;
        });
    }
}
