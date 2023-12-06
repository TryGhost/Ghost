import {Actor} from '../types/actor.type';
import ObjectID from 'bson-objectid';
import {now} from '../helpers/date.helper';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function equals(a: any, b: any) {
    if (typeof a.equals === 'function') {
        return a.equals(b);
    }
    return a === b;
}

type BaseEntityData = {
    id: ObjectID;
    deleted: boolean;
    createdAt: Date;
    createdBy: ObjectID;
    updatedAt: Date | null;
    updatedBy: ObjectID | null;
}

export class Entity<Data> {
    constructor(protected attr: Data & BaseEntityData, actor?: Actor) {
        this.attr = attr;
        if (!this.attr.id) {
            this.attr.id = new ObjectID();
        }
        if (!this.attr.createdAt) {
            this.attr.createdAt = now();
        }
        if (actor) {
            this.actor = actor;
        }
        if (!this.attr.createdBy) {
            if (this.actor) {
                this.attr.createdBy = this.actor.id;
            } else {
                // TODO - What do we do here?
                this.attr.createdBy = new ObjectID();
            }
        }
        this.attr.deleted = false;
    }
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

    get deleted() {
        return this.attr.deleted;
    }

    delete() {
        this.attr.deleted = true;
    }

    protected set<K extends keyof Data>(key: K, value: Data[K], actor?: Actor) {
        if (equals(this.attr[key], value)) {
            return;
        }
        (this.attr as Data)[key] = value;
        if (actor) {
            this.attr.updatedAt = now();
            this.attr.updatedBy = actor.id;
        } else if (this.actor) {
            this.attr.updatedAt = now();
            this.attr.updatedBy = this.actor.id;
        } else {
            // Maybe log a warning or smth?
        }
    }
}
