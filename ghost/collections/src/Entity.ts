
type Writeable<T> = {
    -readonly [K in keyof T]: T[K]
};
class EntityImpl<Data> {
    private _attr: Writeable<Data>
    protected attr: Writeable<Data>
    protected fields!: (keyof Data)[]
    protected writeableFields!: (keyof Data)[]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    protected validations!: any;

    constructor(data: Data) {
        this._attr = data;
        this.attr = new Proxy(this._attr, {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            set(target: any, key: any, value: unknown) {
                if (target[key] !== value) {
                    if (Reflect.has(target, 'updatedAt')) {
                        target.updatedAt = new Date();
                    }
                }
                target[key] = value;
                return true;
            }
        });
    }

    protected initialise() {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const entity = this;
        for (const field of entity.fields) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const definition = Object.getOwnPropertyDescriptor((entity as any).constructor.prototype, field)
            let setter = definition?.set;

            if (!setter && entity.writeableFields.includes(field)) {
                setter = function setter(value: unknown) {
                    const validator = entity.validations && Reflect.get(entity.validations, field);
                    if (validator !== undefined) {
                        validator((entity as unknown as Entity<Data>), value);
                    }
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    entity.attr[field] = value as any;
                }
            }
            Object.defineProperty(entity, field, {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                get(): any {
                    return entity.attr[field];
                },
                set: setter
            });
        }
    }

    protected validate(field?: keyof Data, value?: Data[keyof Data]) {
        if (field && arguments.length === 2) {
            const validator = Reflect.get(this.validations, field);
            if (validator !== undefined) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (validator as any)(this, value);
            }
        } else {
            for (const field of this.fields) {
                const validator = Reflect.get(this.validations, field);
                if (validator !== undefined) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (validator as any)(this, (this as unknown as Data)[field]);
                }
            }
        }
    }

    toJSON(): Data {
        const json = {} as Data;
        for (const field of this.fields) {
            json[field] = (this as unknown as Data)[field];
        }
        return json;
    }

    private _deleted = false;
    get deleted() {
        return this._deleted;
    }
    protected setDeleted() {
        this._deleted = true;
    }
}

// Copy is required so that we can add a getter in the derived class
type Copy<T> = {
    [K in keyof T]: T[K]
}
type Entity<T> = EntityImpl<T> & Copy<T>;

// export const Entity: new <T>(data: T) => WriteableEntity<T> & Copy<T> = WriteableEntity as any;

// This indirection gives better type feedback
// instead of above
type EntityBase<T> = Entity<T>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const Entity: new <T>(data: T) => EntityBase<T> = EntityImpl as any;
