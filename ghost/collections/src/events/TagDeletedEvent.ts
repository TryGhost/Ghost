export class TagDeletedEvent {
    id: string;
    data: {slug: string, id: string};
    timestamp: Date;

    constructor(data: {slug: string, id: string}, timestamp: Date) {
        this.id = data.id;
        this.data = data;
        this.timestamp = timestamp;
    }

    static create(data: any, timestamp = new Date()) {
        return new TagDeletedEvent(data, timestamp);
    }
}
