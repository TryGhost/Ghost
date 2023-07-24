type PostData = {
    id: string;
    featured: boolean;
    published_at: Date;
    tags: Array<{slug: string}>;
};

export class PostAddedEvent {
    id: string;
    data: PostData;
    timestamp: Date;

    constructor(data: PostData, timestamp: Date) {
        this.id = data.id;
        this.data = data;
        this.timestamp = timestamp;
    }

    static create(data: any, timestamp = new Date()) {
        return new PostAddedEvent(data, timestamp);
    }
}
