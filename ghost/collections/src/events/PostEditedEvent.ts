type PostEditData = {
    id: string;
    current: {
        id: string;
        title: string;
        status: string;
        featured: boolean;
        published_at: Date;
        tags: Array<{slug: string}>;
    },
    previous: {
        id: string;
        title: string;
        status: string;
        featured: boolean;
        published_at: Date;
        tags: Array<{slug: string}>;
    }
};

export class PostEditedEvent {
    id: string;
    data: PostEditData;
    timestamp: Date;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    constructor(data: any, timestamp: Date) {
        this.id = data.id;
        this.data = data;
        this.timestamp = timestamp;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    static create(data: any, timestamp = new Date()) {
        return new PostEditedEvent(data, timestamp);
    }
}
