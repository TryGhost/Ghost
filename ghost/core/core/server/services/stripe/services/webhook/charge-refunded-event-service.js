const logging = require('@tryghost/logging');

/**
 * Handles `charge.refunded` webhook events
 *
 * When a charge is refunded in Stripe, this service delegates to the
 * appropriate handler based on the type of charge.
 */
module.exports = class ChargeRefundedEventService {
    /**
     * @param {object} deps
     * @param {object} deps.giftService
     */
    constructor(deps) {
        this.deps = deps;
    }

    /**
     * Handles a `charge.refunded` event
     *
     * Extracts the payment intent ID from the charge and delegates to
     * type-specific handlers.
     *
     * @param {import('stripe').Stripe.Charge} charge
     */
    async handleEvent(charge) {
        // payment_intent can be a string ID or an expanded PaymentIntent object
        const raw = charge.payment_intent;
        const paymentIntentId = typeof raw === 'string' ? raw : raw?.id;

        if (!paymentIntentId) {
            logging.info('charge.refunded: no payment_intent on charge, skipping');

            return;
        }

        // One-time payments (gifts, donations) have no invoice
        if (charge.invoice === null) {
            await this.handleGiftRefundEvent(paymentIntentId);
        }
    }

    /**
     * Handles a refund for a gift subscription purchase
     *
     * Looks up the gift by payment intent ID and marks it as refunded.
     * If no gift matches, the refund is for something else and is ignored.
     *
     * @param {string} paymentIntentId
     * @private
     */
    async handleGiftRefundEvent(paymentIntentId) {
        const refunded = await this.deps.giftService.refund(paymentIntentId);

        if (!refunded) {
            logging.info(`charge.refunded: no gift found for payment_intent ${paymentIntentId}, skipping`);
        }
    }
};
