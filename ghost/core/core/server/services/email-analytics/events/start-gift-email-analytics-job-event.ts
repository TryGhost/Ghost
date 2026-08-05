export class StartGiftEmailAnalyticsJobEvent {
    readonly timestamp: Date;

    constructor(timestamp: Date) {
        this.timestamp = timestamp;
    }

    static create(timestamp = new Date()) {
        return new StartGiftEmailAnalyticsJobEvent(timestamp);
    }
}
