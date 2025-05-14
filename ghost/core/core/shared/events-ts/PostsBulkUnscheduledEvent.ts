export class PostsBulkUnscheduledEvent {
    data: string[];
    timestamp: Date;

    constructor(data: string[], timestamp: Date) {
        this.data = data;
        this.timestamp = timestamp;
    }

    static create(data: string[], timestamp = new Date()) {
        return new PostsBulkUnscheduledEvent(data, timestamp);
    }
}
