const errors = require('@tryghost/errors');
const {MachinePaymentEvent} = require('./machine-payment-event');

const isUniqueConstraintError = err => err?.code === 'ER_DUP_ENTRY' || err?.code?.startsWith?.('SQLITE_CONSTRAINT');

class MachinePaymentEventRepository {
    #Model;

    constructor({MachinePaymentEventModel}) {
        this.#Model = MachinePaymentEventModel;
    }

    /**
     * @param {object} data
     * @param {string} data.postId
     * @param {number} data.amount
     * @param {string} data.currency
     * @param {string} data.protocol
     * @param {string} data.method
     * @param {string|null} [data.stripePaymentIntentId]
     * @param {string} data.reference
     */
    /**
     * @returns {Promise<{event: object, created: boolean}>}
     */
    async save(data) {
        const event = MachinePaymentEvent.create(data);

        const existing = await this.#findByProtocolReference(event.protocol, event.reference);
        if (existing) {
            return {event: existing, created: false};
        }

        try {
            const created = await this.#Model.add({
                post_id: event.postId,
                amount: event.amount,
                currency: event.currency,
                protocol: event.protocol,
                method: event.method,
                stripe_payment_intent_id: event.stripePaymentIntentId,
                reference: event.reference,
                created_at: event.timestamp
            }, {context: {internal: true}});
            return {event: created, created: true};
        } catch (err) {
            if (!isUniqueConstraintError(err)) {
                throw err;
            }

            const raced = await this.#findByProtocolReference(event.protocol, event.reference);
            if (raced) {
                return {event: raced, created: false};
            }

            throw new errors.InternalServerError({
                err,
                message: 'Failed to persist machine payment event after unique constraint conflict'
            });
        }
    }

    async #findByProtocolReference(protocol, reference) {
        return await this.#Model.findOne({protocol, reference});
    }
}

module.exports = MachinePaymentEventRepository;
