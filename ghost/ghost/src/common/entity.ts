import {Actor} from './actor';
import ObjectID from 'bson-objectid';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function equals(a: any, b: any) {
    if (typeof a.equals === 'function') {
        return a.equals(b);
    }
    return a === b;
}

type BaseEntityData = {
    id: ObjectID;
    createdAt: Date;
    createdBy: ObjectID;
    updatedAt: Date | null;
    updatedBy: ObjectID | null;
}

export class Entity<Data> {
    constructor(protected attr: Data & BaseEntityData) {}
    private actor?: Actor | null;
    setActor(actor: Actor) {
        if (this.actor !== null) {
            throw new Error(`Entity already owned by ${actor.id}`);
        }
        this.actor = actor;
    }

    get id() {
        return this.attr.id;
    }

    get createdAt() {
        return this.attr.createdAt;
    }

    get createdBy() {
        return this.attr.createdBy;
    }

    get updatedAt() {
        return this.attr.updatedAt;
    }

    get updatedBy() {
        return this.attr.updatedBy;
    }

    protected set<K extends keyof Data>(key: K, value: Data[K], actor?: Actor) {
        if (equals(this.attr[key], value)) {
            return;
        }
        (this.attr as Data)[key] = value;
        if (actor) {
            this.attr.updatedAt = new Date();
            this.attr.updatedBy = actor.id;
        } else if (this.actor) {
            this.attr.updatedAt = new Date();
            this.attr.updatedBy = this.actor.id;
        } else {
            // Maybe log a warning or smth?
        }
    }
}
