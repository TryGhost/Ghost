const {Stripe} = require('stripe');
const settingsHelpers = require('../../settings-helpers');
const {STRIPE_MACHINE_PAYMENTS_API_VERSION} = require('./deposit-address-store');

/**
 * Records settled machine payments as Stripe PaymentIntents for Dashboard visibility.
 */
class PaymentRecorder {
    constructor({
        stripeFactory = secretKey => new Stripe(secretKey, {apiVersion: STRIPE_MACHINE_PAYMENTS_API_VERSION}),
        settingsHelpersFacade = settingsHelpers
    } = {}) {
        this.stripeFactory = stripeFactory;
        this.settingsHelpers = settingsHelpersFacade;
        this.stripe = null;
        this.stripeSecretKey = null;
    }

    /**
     * @param {{method: string, reference: string, amount: number, currency: string, postId: string, protocol?: string}} payment
     */
    async record(payment) {
        if (!payment?.reference) {
            return null;
        }

        const stripe = this.#getStripe();
        if (!stripe) {
            return null;
        }
        const amountInCents = Math.round(Number(payment.amount));
        if (!Number.isFinite(amountInCents) || amountInCents < 1) {
            return null;
        }

        // SPT / card rails already create a PaymentIntent via mppx stripe.charge.
        if (payment.method === 'spt' || payment.method === 'stripe') {
            return payment.stripePaymentIntentId || null;
        }

        const network = payment.method === 'tempo' ? 'tempo' : payment.method;
        if (!network) {
            return null;
        }

        const pi = await stripe.paymentIntents.create({
            amount: amountInCents,
            // Tempo USDC settlement is recorded as USD cents via Stripe's
            // transaction_verification crypto PaymentIntent flow.
            currency: 'usd',
            confirm: true,
            payment_method_data: {type: 'crypto'},
            payment_method_types: ['crypto'],
            payment_method_options: {
                crypto: {
                    mode: 'transaction_verification',
                    transaction_verification_options: {
                        network,
                        transaction_hash: payment.reference
                    }
                }
            },
            metadata: {
                ghost_machine_payment: 'true',
                post_id: payment.postId,
                protocol: payment.protocol || 'mpp'
            }
        }, {
            idempotencyKey: `machine-payment:${payment.reference}`
        });

        return pi.id;
    }

    #getStripe() {
        const keys = this.settingsHelpers.getActiveStripeKeys();
        const secretKey = keys?.secretKey;
        if (!secretKey) {
            return null;
        }
        if (this.stripe && this.stripeSecretKey === secretKey) {
            return this.stripe;
        }
        this.stripeSecretKey = secretKey;
        this.stripe = this.stripeFactory(secretKey);
        return this.stripe;
    }
}

module.exports = PaymentRecorder;
