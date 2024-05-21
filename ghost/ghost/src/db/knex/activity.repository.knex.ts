import {Inject} from '@nestjs/common';
import ObjectID from 'bson-objectid';
import {ActivityRepository} from '../../core/activitypub/activity.repository';
import {Activity} from '../../core/activitypub/activity.entity';
import {Actor} from '../../core/activitypub/actor.entity';
import {ActivityPub} from '../../core/activitypub/types';
import {URI} from '../../core/activitypub/uri.object';

export class ActivityRepositoryKnex implements ActivityRepository {
    constructor(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        @Inject('knex') private readonly knex: any
    ) {}

    private async dbToActivity(model: ActivityPub.ActivityPubActivityDBData) {
        const actor = model.data.actor ? Actor.create({username: model.data.actor.username}) : undefined;
        const object = model.data.object
            ?  {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                ...model.data.object,
                id: new URI(model.data.object.id),
                type: model.data.object.type,
            }
            : undefined;

        return Activity.create({
            id: ObjectID.createFromHexString(model.id),
            activity: new URI(model.url),
            type: model.type,
            actor,
            object,
            to: new URI(model.data.to),
            createdAt: new Date(model.created_at),
            updatedAt: new Date(model.updated_at)
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
        const data = {
            actor: activity.getActor,
            object: activity.getObject,
            to: activity?.to?.href

        };

        await this.knex('prototype_activitypub')
            .insert({
                id: new ObjectID().toHexString(),
                activity: activity.activityId?.href,
                type: activity.type,
                data: JSON.stringify(data),
                created_at: activity.createdAt || new Date(),
                updated_at: activity.updatedAt || new Date()
            });
    }
};
