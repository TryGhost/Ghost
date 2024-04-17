import ObjectID from 'bson-objectid';
import {Actor} from './actor.entity';

export interface ActorRepository {
    getOne(username: string): Promise<Actor | null>
    getOne(id: ObjectID): Promise<Actor | null>
    save(actor: Actor): Promise<void>
}
