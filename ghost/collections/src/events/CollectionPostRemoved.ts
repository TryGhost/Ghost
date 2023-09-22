type CollectionPostRemovedData = {
    collection_id: string;
    post_id: string;
};

export class CollectionPostRemoved {
    data: CollectionPostRemovedData;
    timestamp: Date;
    type = 'CollectionPostRemoved' as const;

    constructor(data: CollectionPostRemovedData, timestamp: Date) {
        this.data = data;
        this.timestamp = timestamp;
    }

    static create(data: CollectionPostRemovedData, timestamp = new Date()) {
        return new CollectionPostRemoved(data, timestamp);
    }
}
