export class PostDeletedEvent {
    id: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: any;
    timestamp: Date;

    constructor(data: PostDeletedEvent, timestamp: Date) {
        this.id = data.id;
        this.data = data.data;
        this.timestamp = timestamp;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    static create(data: any, timestamp = new Date()) {
        return new PostDeletedEvent(data, timestamp);
    }
}
