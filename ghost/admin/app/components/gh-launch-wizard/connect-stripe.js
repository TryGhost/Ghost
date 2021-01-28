import Component from '@glimmer/component';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency-decorators';
import {timeout} from 'ember-concurrency';
import {tracked} from '@glimmer/tracking';

export default class GhLaunchWizardConnectStripeComponent extends Component {
    @service config;
    @service ghostPaths;
    @service settings;

    @tracked stripeConnectTestMode = false;
    @tracked stripeConnectError = null;

    get stripeConnectAuthUrl() {
        const mode = this.stripeConnectTestMode ? 'test' : 'live';
        return `${this.ghostPaths.url.api('members/stripe_connect')}?mode=${mode}`;
    }

    constructor() {
        super(...arguments);
        this.args.updatePreview('');
    }

    willDestroy() {
        // clear any unsaved settings changes when going back/forward/closing
        this.settings.rollbackAttributes();
    }

    @action
    setStripeDirectPublicKey(event) {
        this.settings.set('stripeProductName', this.settings.get('title'));
        this.settings.set('stripePublishableKey', event.target.value);
    }

    @action
    setStripeDirectSecretKey(event) {
        this.settings.set('stripeProductName', this.settings.get('title'));
        this.settings.set('stripePublishableKey', event.target.value);
    }

    @action
    toggleStripeConnectTestMode() {
        this.stripeConnectTestMode = !this.stripeConnectTestMode;
    }

    @action
    setStripeConnectIntegrationToken(event) {
        this.settings.set('stripeProductName', this.settings.get('title'));
        this.settings.set('stripeConnectIntegrationToken', event.target.value);
        this.stripeConnectError = null;
    }

    @task
    *saveAndContinue() {
        if (this.settings.get('stripeConnectIntegrationToken')) {
            try {
                yield this.settings.save();
                this.pauseAndContinue.perform();
                return true;
            } catch (error) {
                if (error.payload?.errors) {
                    this.stripeConnectError = 'Invalid secure key';
                    return false;
                }

                throw error;
            }
        } else {
            this.stripeConnectError = 'Paste your secure key to continue';
            return false;
        }
    }

    @task
    *pauseAndContinue() {
        yield timeout(500);
        this.args.nextStep();
    }
}
