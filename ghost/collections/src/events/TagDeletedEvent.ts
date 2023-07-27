export class TagDeletedEvent {
    id: string;
    data: {slug: string, id: string};
    timestamp: Date;

    constructor(data: {slug: string, id: string}, timestamp: Date) {
        this.id = data.id;
        this.data = data;
        this.timestamp = timestamp;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    static create(data: any, timestamp = new Date()) {
        return new TagDeletedEvent(data, timestamp);
    }
}
