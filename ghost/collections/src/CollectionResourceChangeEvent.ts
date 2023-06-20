type CollectionResourceChangeEventData = {
    id: string;
    resource: 'post' | 'tag' | 'author';
    [any: string]: any;
};

export class CollectionResourceChangeEvent {
    name: string;
    data: CollectionResourceChangeEventData;
    timestamp: Date;

    constructor(name: string, data: CollectionResourceChangeEventData, timestamp: Date) {
        this.name = name;
        this.data = data;
        this.timestamp = timestamp;
    }

    static create(name: string, data: CollectionResourceChangeEventData, timestamp = new Date()) {
        return new CollectionResourceChangeEvent(name, data, timestamp);
    }
}
