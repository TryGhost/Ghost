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
        this.stripePaymentIntentId = data.stripePaymentIntentId;
        this.reference = data.reference;
    }

    /**
     * @param {Omit<MachinePaymentEvent, 'timestamp'>} data
     * @param {Date} [timestamp]
     */
    static create(data, timestamp) {
        return new MachinePaymentEvent(data, timestamp ?? new Date());
    }
}

module.exports = {MachinePaymentEvent};
