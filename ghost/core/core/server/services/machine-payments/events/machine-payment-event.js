const errors = require('@tryghost/errors');

class MachinePaymentEvent {
    /**
     * @param {Omit<MachinePaymentEvent, 'timestamp'>} data
     * @param {Date} timestamp
     */
    constructor(data, timestamp) {
        this.timestamp = timestamp;
        this.postId = data.postId;
        this.amount = data.amount;
        this.currency = data.currency;
        this.protocol = data.protocol;
        this.method = data.method;
        this.stripePaymentIntentId = data.stripePaymentIntentId ?? null;
        this.reference = data.reference;
    }

    /**
     * @param {Omit<MachinePaymentEvent, 'timestamp'>} data
     * @param {Date} [timestamp]
     */
    static create(data, timestamp) {
        const required = ['postId', 'amount', 'currency', 'protocol', 'method', 'reference'];
        for (const key of required) {
            if (data?.[key] === undefined || data?.[key] === null || data?.[key] === '') {
                throw new errors.ValidationError({
                    message: `MachinePaymentEvent.${key} is required`
                });
            }
        }

        return new MachinePaymentEvent(data, timestamp ?? new Date());
    }
}

module.exports = {MachinePaymentEvent};
