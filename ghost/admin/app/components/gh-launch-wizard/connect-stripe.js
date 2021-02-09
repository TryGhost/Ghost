import Component from '@glimmer/component';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency-decorators';
import {timeout} from 'ember-concurrency';
import {tracked} from '@glimmer/tracking';

export default class GhLaunchWizardConnectStripeComponent extends Component {
    @service ajax;
    @service config;
    @service ghostPaths;
    @service settings;

    @tracked hasActiveStripeSubscriptions = false;
    @tracked showDisconnectStripeConnectModal = false;
    @tracked stripeConnectTestMode = false;
    @tracked stripeConnectError = null;
    @tracked stripePublishableKeyError = null;
    @tracked stripeSecretKeyError = null;

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
        this.stripePublishableKeyError = null;
    }

    @action
    setStripeDirectSecretKey(event) {
        this.settings.set('stripeProductName', this.settings.get('title'));
        this.settings.set('stripeSecretKey', event.target.value);
        this.stripeSecretKeyError = null;
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

    @task({drop: true})
    *openDisconnectStripeConnectModalTask() {
        this.hasActiveStripeSubscriptions = false;

        const url = this.ghostPaths.url.api('/members/hasActiveStripeSubscriptions');
        const response = yield this.ajax.request(url);

        if (response.hasActiveStripeSubscriptions) {
            this.hasActiveStripeSubscriptions = true;
            return;
        }

        this.showDisconnectStripeConnectModal = true;
    }

    @action
    closeDisconnectStripeModal() {
        this.showDisconnectStripeConnectModal = false;
    }

    @task
    *disconnectStripeConnectIntegrationTask() {
        this.disconnectStripeError = false;
        const url = this.ghostPaths.url.api('/settings/stripe/connect');

        yield this.ajax.delete(url);
        yield this.settings.reload();
    }

    @task
    *saveAndContinueTask() {
        if (this.config.get('stripeDirect')) {
            if (!this.settings.get('stripePublishableKey')) {
                this.stripePublishableKeyError = 'Enter your publishable key to continue';
            }

            if (!this.settings.get('stripeSecretKey')) {
                this.stripeSecretKeyError = 'Enter your secret key to continue';
            }

            if (this.stripePublishableKeyError || this.stripeSecretKeyError) {
                return false;
            }
        } else if (!this.settings.get('stripeConnectAccountId') && !this.settings.get('stripeConnectIntegrationToken')) {
            this.stripeConnectError = 'Paste your secure key to continue';
            return false;
        }

        if (!this.config.get('stripeDirect') && this.settings.get('stripeConnectAccountId')) {
            this.args.nextStep();
            return true;
        }

        try {
            yield this.settings.save();
            this.pauseAndContinueTask.perform();
            return true;
        } catch (error) {
            if (error.payload?.errors && error.payload.errors[0].type === 'ValidationError') {
                const [validationError] = error.payload.errors;

                if (this.config.get('stripeDirect')) {
                    if (validationError.context.match(/stripe_publishable_key/)) {
                        this.stripePublishableKeyError = 'Invalid publishable key';
                    } else {
                        this.stripeSecretKeyError = 'Invalid secret key';
                    }
                } else {
                    this.stripeConnectError = 'Invalid secure key';
                }
            }

            throw error;
        }
    }

    @task
    *pauseAndContinueTask() {
        this.args.refreshPreview();
        yield timeout(500);
        this.args.nextStep();
    }
}
