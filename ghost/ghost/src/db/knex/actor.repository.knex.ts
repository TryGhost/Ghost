import {Inject} from '@nestjs/common';
import ObjectID from 'bson-objectid';
import {ActorRepository} from '../../core/activitypub/actor.repository';
import {Actor} from '../../core/activitypub/actor.entity';
import {SettingsCache} from '../../common/types/settings-cache.type';

interface DomainEvents {
    dispatch(event: unknown): void
}

export class ActorRepositoryKnex implements ActorRepository {
    private readonly domainEvents: DomainEvents;

    #defaultActor: Actor;

    constructor(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        @Inject('knex') private readonly knex: any,
        @Inject('SettingsCache') settingsCache: SettingsCache,
        @Inject('DomainEvents') domainEvents: DomainEvents
    ) {
        this.#defaultActor = Actor.create({
            id: ObjectID.createFromHexString('deadbeefdeadbeefdeadbeef'),
            username: 'index',
            displayName: settingsCache.get('title'),
            publicKey: settingsCache.get('ghost_public_key'),
            privateKey: settingsCache.get('ghost_private_key'),
            following: [],
            internal: true
        });
        this.domainEvents = domainEvents;

        this.save(this.#defaultActor);
    }

    #modelToActor(model: any) {
        return Actor.create({
            id: ObjectID.createFromHexString(model.id),
            username: model.data.username,
            displayName: model.data.displayName,
            publicKey: model.public_key,
            privateKey: model.private_key,
            following: model.data.following,
            followers: model.data.followers,
            featured: model.data.features,
            inbox: model.data.inbox,
            outbox: model.data.outbox
        });
    }

    private async getOneByUsername(username: string) {
        const row = await this.knex('prototype_activitypub')
            .leftOuterJoin('prototype_activitypub_actors_keys', 'prototype_activitypub.url', 'prototype_activitypub_actors_keys.actor_id')
            .where('prototype_activitypub.type', 'Person')
            .whereJsonObject('prototype_activitypub.data', {username})
            .first();

        if (!row) {
            return null;
        }
        return this.#modelToActor(row);
    }

    private async getOneById(id: ObjectID) {
        const row = await this.knex('prototype_activitypub')
            .leftOuterJoin('prototype_activitypub_actors_keys', 'prototype_activitypub.url', 'prototype_activitypub_actors_keys.actor_id')
            .where('prototype_activitypub.type', 'Person')
            .where('prototype_activitypub.id', id.toHexString())
            .first();

        if (!row) {
            return null;
        }
        return this.#modelToActor(row);
    }

    async getOne(identifier: string | ObjectID) {
        if (identifier instanceof ObjectID) {
            return await this.getOneById(identifier);
        } else {
            return await this.getOneByUsername(identifier);
        }
    }

    async save(actor: Actor) {
        const data = {
            username: actor.username,
            displayName: actor.displayName,
            following: actor.following,
            followers: actor.followers,
            features: actor.featured,
            inbox: actor.inbox,
            outbox: actor.outbox
        };

        const date = this.knex.raw('CURRENT_TIMESTAMP');
        const id = actor.id;
        const url = actor.actorId.toString();
        const publicKey = actor.publicKey;
        const privateKey = actor.privateKey;
        const existingActor = await this.getOne(id || actor?.username);

        if (!existingActor) {
            await this.knex('prototype_activitypub')
                .insert({
                    id: id.toHexString(),
                    type: 'Person',
                    url,
                    data: JSON.stringify(data),
                    created_at: date,
                    updated_at: date
                });

            await this.knex('prototype_activitypub_actors_keys')
                .insert({
                    id: id.toHexString() || new ObjectID().toHexString(),
                    actor_id: url,
                    public_key: publicKey,
                    private_key: privateKey,
                    created_at: date,
                    updated_at: date
                });
        } else {
            await this.knex('prototype_activitypub')
                .where('id', id.toHexString())
                .update({
                    data: JSON.stringify(data),
                    updated_at: date
                });

            await this.knex('prototype_activitypub_actors_keys')
                .where('actor_id', url)
                .update({
                    public_key: publicKey,
                    private_key: privateKey,
                    updated_at: date
                });
        }
        Actor.getActivitiesToSave(actor, (/* activities */) => {
            // Persist activities
        });
        Actor.getEventsToDispatch(actor, (events) => {
            for (const event of events) {
                this.domainEvents.dispatch(event);
            }
        });
    }
};
