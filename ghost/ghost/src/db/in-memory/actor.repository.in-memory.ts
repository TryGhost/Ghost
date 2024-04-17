import {Actor} from '../../core/activitypub/actor.entity';
import {ActorRepository} from '../../core/activitypub/actor.repository';
import ObjectID from 'bson-objectid';
import {Inject} from '@nestjs/common';
import {SettingsCache} from '../../common/types/settings-cache.type';

export class ActorRepositoryInMemory implements ActorRepository {
    actors: Actor[];

    constructor(@Inject('SettingsCache') settingsCache: SettingsCache) {
        this.actors = [
            Actor.create({
                id: ObjectID.createFromHexString('000000000000000000000000'),
                username: 'index',
                publicKey: settingsCache.get('ghost_public_key'),
                privateKey: settingsCache.get('ghost_private_key')
            })
        ];
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
        throw new Error('Not Implemented');
    }
}
