const {MachinePaymentEvent} = require('./machine-payment-event');

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
    async save(data) {
        const event = MachinePaymentEvent.create(data);

        // Idempotent on protocol+reference when a unique constraint exists.
        const existing = await this.#Model.findOne({
            protocol: event.protocol,
            reference: event.reference
        });
        if (existing) {
            return existing;
        }

        return await this.#Model.add({
            post_id: event.postId,
            amount: event.amount,
            currency: event.currency,
            protocol: event.protocol,
            method: event.method,
            stripe_payment_intent_id: event.stripePaymentIntentId,
            reference: event.reference,
            created_at: event.timestamp
        }, {context: {internal: true}});
    }
}

module.exports = MachinePaymentEventRepository;
