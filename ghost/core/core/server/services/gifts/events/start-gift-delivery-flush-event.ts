export class StartGiftDeliveryFlushEvent {
    readonly timestamp: Date;

    constructor(timestamp: Date) {
        this.timestamp = timestamp;
    }

    static create(timestamp = new Date()) {
        return new StartGiftDeliveryFlushEvent(timestamp);
    }
}
