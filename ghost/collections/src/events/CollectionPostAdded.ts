type CollectionPostAddedData = {
    collection_id: string;
    post_id: string;
};

export class CollectionPostAdded {
    data: CollectionPostAddedData;
    timestamp: Date;
    type = 'CollectionPostAdded' as const;

    constructor(data: CollectionPostAddedData, timestamp: Date) {
        this.data = data;
        this.timestamp = timestamp;
    }

    static create(data: CollectionPostAddedData, timestamp = new Date()) {
        return new CollectionPostAdded(data, timestamp);
    }
}
