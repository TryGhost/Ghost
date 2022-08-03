import classic from 'ember-classic-decorator';
import {computed} from '@ember/object';
import {inject as service} from '@ember/service';
/* eslint-disable ghost/ember/alias-model-in-controller */
import Controller from '@ember/controller';
import {task} from 'ember-concurrency';

@classic
export default class IntegrationsController extends Controller {
    @service settings;
    @service store;
    @service config;

    _allIntegrations = null;

    init() {
        super.init(...arguments);
        this._allIntegrations = this.store.peekAll('integration');
    }

    @computed('config.hostSettings.limits')
    get zapierDisabled() {
        return this.config.get('hostSettings.limits.customIntegrations.disabled');
    }

    // filter over the live query so that the list is automatically updated
    // as integrations are added/removed
    @computed('_allIntegrations.@each.{isNew,type}')
    get integrations() {
        return this._allIntegrations.reject((integration) => {
            return integration.isNew || integration.type !== 'custom';
        });
    }

    // use ember-concurrency so that we can use the derived state to show
    // a spinner only in the integrations list and avoid delaying the whole
    // screen display
    @task(function* () {
        return yield this.store.findAll('integration');
    })
        fetchIntegrations;

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
