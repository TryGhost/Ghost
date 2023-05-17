// have to use requires until there are type definitions for these modules
const {ValidationError} = require('@tryghost/errors');
const tpl = require('@tryghost/tpl');

import ObjectID from 'bson-objectid';
import {InMemoryRepository} from '@tryghost/in-memory-repository';
import {Collection} from './Collection';

const messages = {
    invalidIDProvided: 'Invalid ID provided for Collection'
};

export class CollectionsRepositoryInMemory extends InMemoryRepository<string, Collection> {
    constructor() {
        super();
    }

    async create(data: any): Promise<Collection> {
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

        return {
            id: id.toHexString(),
            title: data.title,
            description: data.description,
            type: data.type,
            filter: data.filter,
            feature_image: data.feature_image,
            deleted: data.deleted || false
        };
    }

    protected toPrimitive(entity: Collection): object {
        return {
            title: entity.title,
            description: entity.description,
            feature_image: entity.feature_image
        };
    }
}
