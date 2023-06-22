export class CollectionResourceChangeEvent {
    name: string;
    resourceType: 'post' | 'tag' | 'author';
    data: {
        id: string;
    };
    timestamp: Date;

    constructor(name: string, data: {id: string}, timestamp: Date) {
        this.name = name;
        this.resourceType = name.split('.')[0] as 'post' | 'tag' | 'author';
        this.data = data;
        this.timestamp = timestamp;
    }

    static create(name: string, data: {id: string}, timestamp = new Date()) {
        return new CollectionResourceChangeEvent(name, data, timestamp);
    }
}
