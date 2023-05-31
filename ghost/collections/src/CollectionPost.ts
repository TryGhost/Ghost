import {ValidationError} from '@tryghost/errors';
import tpl from '@tryghost/tpl';
import ObjectID from 'bson-objectid';

const messages = {
    invalidIDProvided: 'Invalid ID provided for CollectionPost'
};

export class CollectionPost {
    id: string;
    postId: string;
    collectionId: string;
    sortOrder: number;
    deleted: boolean;

    constructor(data: any) {
        this.id = data.id;
        this.postId = data.postId;
        this.collectionId = data.collectionId;
        this.sortOrder = data.sortOder;
        this.deleted = data.deleted;
    }

    static async create(data: any): Promise<CollectionPost> {
        let id;

        if (!data.id) {
            id = new ObjectID();
        } else if (typeof data.id === 'string') {
            id = ObjectID.createFromHexString(data.id);
        } else if (data.id instanceof ObjectID) {
            id = data.id;
        } else {
            throw new ValidationError({
                message: tpl(messages.invalidIDProvided)
            });
        }

        return new CollectionPost({
            id: id.toHexString(),
            postId: data.post_id,
            collectionId: data.collection_id,
            sortOrder: data.sort_order, // NOTE: make sort_order required during creation
            deleted: false
        });
    }
}
