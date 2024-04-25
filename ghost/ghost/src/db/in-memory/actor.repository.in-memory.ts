import {Actor} from '../../core/activitypub/actor.entity';
import {ActorRepository} from '../../core/activitypub/actor.repository';
import ObjectID from 'bson-objectid';
import {Inject} from '@nestjs/common';
import {SettingsCache} from '../../common/types/settings-cache.type';

interface DomainEvents {
    dispatch(event: unknown): void
}

export class ActorRepositoryInMemory implements ActorRepository {
    actors: Actor[];

    private readonly domainEvents: DomainEvents;

    constructor(
        @Inject('SettingsCache') settingsCache: SettingsCache,
        @Inject('DomainEvents') domainEvents: DomainEvents
    ) {
        this.actors = [
            Actor.create({
                id: ObjectID.createFromHexString('deadbeefdeadbeefdeadbeef'),
                username: 'index',
                publicKey: settingsCache.get('ghost_public_key'),
                privateKey: settingsCache.get('ghost_private_key'),
                outbox: []
            })
        ];
        this.domainEvents = domainEvents;
    }

    private getOneByUsername(username: string) {
        return this.actors.find(actor => actor.username === username) || null;
    }

    private getOneById(id: ObjectID) {
        return this.actors.find(actor => actor.id.equals(id)) || null;
    }

    async getOne(identifier: string | ObjectID) {
        if (identifier instanceof ObjectID) {
            return this.getOneById(identifier);
        } else {
            return this.getOneByUsername(identifier);
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async save(actor: Actor) {
        if (!this.actors.includes(actor)) {
            this.actors.push(actor);
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
}
