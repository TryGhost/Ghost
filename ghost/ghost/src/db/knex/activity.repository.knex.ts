import {Inject} from '@nestjs/common';
import ObjectID from 'bson-objectid';
import {ActivityRepository} from '../../core/activitypub/activity.repository';
import {Activity} from '../../core/activitypub/activity.entity';
import {ActivityPub} from '../../core/activitypub/types';
import {URI} from '../../core/activitypub/uri.object';

function getIdFromURL(url: string) {
    const idRegex = /([a-z0-9-_]*)(?:\/)?$/ig;
    const match = url.match(idRegex);

    if (!match) {
        return url;
    }

    return match[0];
}
export class ActivityRepositoryKnex implements ActivityRepository {
    constructor(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        @Inject('knex') private readonly knex: any
    ) {}

    private async dbToActivity(model: ActivityPub.ActivityPubActivityDBData) {
        const actor = model.data.actor
            ? {
                ...model.data.actor,
                id: new URI(model.data.actor.id),
                type: model.data.actor.type
            }
            : undefined;

        const object = model.data.object
            ? {
                ...model.data.object,
                id: new URI(model.data.object.id),
                type: model.data.object.type
            }
            : undefined;

        return Activity.create({
            id: ObjectID.createFromHexString(getIdFromURL(model.id)),
            activity: new URI(model.url),
            type: model.type,
            actor,
            object,
            to: new URI(model.data.to),
            createdAt: new Date(model.created_at)
        });
    }

    async getOne(id: URL) {
        const row = await this.knex('prototype_activitypub')
            .where('id', id.href)
            .first();

        if (!row) {
            return null;
        }
        return await this.dbToActivity(row);
    }

    async save(activity: Activity) {
        let exists;
        const data = activity.getJSON();

        if (activity.activityId) {
            exists = await this.getOne(activity.activityId);
        }

        if (!exists) {
            await this.knex('prototype_activitypub')
                .insert({
                    id: new ObjectID().toHexString(),
                    url: activity.activityId?.href,
                    type: activity.type,
                    data: JSON.stringify(data),
                    created_at: activity.createdAt || new Date()
                });
        } else {
            await this.knex('prototype_activitypub')
                .where('id', activity.activityId?.href)
                .update({
                    type: activity.type,
                    url: activity.activityId?.href,
                    data: JSON.stringify(data),
                    updated_at: activity.updatedAt || new Date()
                });
        }
    }
};
