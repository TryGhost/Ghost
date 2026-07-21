import ObjectID from 'bson-objectid';

export class LinkRedirect {
    link_id: undefined | ObjectID;
    from: URL;
    to: URL;
    edited: boolean;

    constructor(data: {id?: string; from: URL; to: URL; edited?: boolean}) {
        if (!data.id) {
            this.link_id = new ObjectID();
        }

        if (typeof data.id === 'string') {
            this.link_id = ObjectID.createFromHexString(data.id);
        }

        this.from = data.from;
        this.to = data.to;
        this.edited = !!data.edited;
    }
}
