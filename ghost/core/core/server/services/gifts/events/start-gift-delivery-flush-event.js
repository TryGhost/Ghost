module.exports = class StartGiftDeliveryFlushEvent {
    static create() {
        return new StartGiftDeliveryFlushEvent(new Date());
    }

    constructor(timestamp) {
        this.timestamp = timestamp;
    }
};
