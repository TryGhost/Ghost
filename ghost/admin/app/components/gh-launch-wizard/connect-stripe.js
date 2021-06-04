import Component from '@glimmer/component';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency-decorators';
import {timeout} from 'ember-concurrency';
import {tracked} from '@glimmer/tracking';

const RETRY_PRODUCT_SAVE_POLL_LENGTH = 1000;
const RETRY_PRODUCT_SAVE_MAX_POLL = 15 * RETRY_PRODUCT_SAVE_POLL_LENGTH;

export default class GhLaunchWizardConnectStripeComponent extends Component {
    @service ajax;
    @service config;
    @service ghostPaths;
    @service settings;
    @service store;

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

    calculateDiscount(monthly, yearly) {
        if (isNaN(monthly) || isNaN(yearly)) {
            return 0;
        }

        return monthly ? 100 - Math.floor((yearly / 12 * 100) / monthly) : 0;
    }

    getActivePrice(prices, interval, amount, currency) {
        return prices.find((price) => {
            return (
                price.active && price.amount === amount && price.type === 'recurring' &&
                price.interval === interval && price.currency.toLowerCase() === currency.toLowerCase()
            );
        });
    }

    @task({drop: true})
    *saveProduct() {
        let pollTimeout = 0;
        while (pollTimeout < RETRY_PRODUCT_SAVE_MAX_POLL) {
            yield timeout(RETRY_PRODUCT_SAVE_POLL_LENGTH);

            try {
                const updatedProduct = yield this.product.save();
                return updatedProduct;
            } catch (error) {
                if (error.payload?.errors && error.payload.errors[0].code === 'STRIPE_NOT_CONFIGURED') {
                    pollTimeout += RETRY_PRODUCT_SAVE_POLL_LENGTH;
                    // no-op: will try saving again as stripe is not ready
                    continue;
                } else {
                    throw error;
                }
            }
        }
        return this.product;
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

            const products = yield this.store.query('product', {include: 'monthly_price,yearly_price'});
            this.product = products.firstObject;
            if (this.product) {
                const yearlyDiscount = this.calculateDiscount(5, 50);
                this.product.set('monthlyPrice', {
                    nickname: 'Monthly',
                    amount: 500,
                    active: 1,
                    description: 'Full access',
                    currency: 'usd',
                    interval: 'month',
                    type: 'recurring'
                });
                this.product.set('yearlyPrice', {
                    nickname: 'Yearly',
                    amount: 5000,
                    active: 1,
                    currency: 'usd',
                    description: yearlyDiscount > 0 ? `${yearlyDiscount}% discount` : 'Full access',
                    interval: 'year',
                    type: 'recurring'
                });
                yield this.saveProduct.perform();
                this.settings.set('portalPlans', ['free', 'monthly', 'yearly']);
                yield this.settings.save();
            }

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
