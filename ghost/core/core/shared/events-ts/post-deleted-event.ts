export class PostDeletedEvent {
    id: string;
    data: any;
    timestamp: Date;

    constructor(data: PostDeletedEvent, timestamp: Date) {
        this.id = data.id;
        this.data = data.data;
        this.timestamp = timestamp;
    }

    static create(data: any, timestamp = new Date()) {
        return new PostDeletedEvent(data, timestamp);
    }
}
