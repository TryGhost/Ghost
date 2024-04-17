import {Actor} from './types/actor.type';
import ObjectID from 'bson-objectid';
import {now} from './helpers/date.helper';
import {BaseEvent} from './event.base';

function equals(a: unknown, b: unknown) {
    if (a === null || b === null) {
        return a === b;
    }
    if (a === undefined || b === undefined) {
        return a === b;
    }
    if (typeof a === 'object' && Reflect.has(a, 'equals')) {
        const equalsFn = Reflect.get(a, 'equals');
        if (typeof equalsFn === 'function') {
            return equalsFn.call(a, b);
        }
    }
    return a === b;
}

type BaseEntityUpdatedXData = {
    updatedAt: Date;
    updatedBy: Actor;
} | {
    updatedAt: null;
    updatedBy: null;
}

type BaseEntityData = {
    id: ObjectID;
    deleted: boolean;
    createdAt: Date;
    createdBy: Actor;
} & BaseEntityUpdatedXData;

type Optional<T> = {
    [K in keyof T]?: T[K]
};

export class Entity<Data> {
    constructor(protected attr: Data & Optional<BaseEntityData>, actor?: Actor) {
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
                this.attr.createdBy = this.actor;
            } else {
                // TODO: This should maybe be system user?
                this.attr.createdBy = {
                    id: ObjectID.createFromHexString('d34d01d0d34d01d0d34d01d0'),
                    type: 'user',
                    role: 'Owner'
                };
            }
        }
        this.attr.deleted = false;
    }

    private events: BaseEvent<unknown>[] = [];
    protected addEvent(event: BaseEvent<unknown>) {
        this.events.push(event);
    }
    static getEventsToDispatch(entity: Entity<unknown>, fn: (events: BaseEvent<unknown>[]) => void) {
        const events = entity.events;
        entity.events = [];
        fn(events);
    }

    private actor?: Actor | null;
    setActor(actor: Actor) {
        if (this.actor !== null) {
            throw new Error(`Entity already owned by ${actor.id}`);
        }
        this.actor = actor;
    }

    get id() {
        return this.attr.id as ObjectID;
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
            this.attr.updatedBy = actor;
        } else if (this.actor) {
            this.attr.updatedAt = now();
            this.attr.updatedBy = this.actor;
        } else {
            // Maybe log a warning or smth?
        }
    }
}
