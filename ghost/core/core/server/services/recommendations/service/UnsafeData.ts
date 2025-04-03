import errors from '@tryghost/errors';

type UnsafeDataContext = {
    field?: string[]
}

function serializeField(field: string[]) {
    if (field.length === 0) {
        return 'data';
    }
    return field.join('.');
}

type NullData = {
    readonly string: null,
    readonly boolean: null,
    readonly number: null,
    readonly integer: null,
    readonly url: null
    enum(allowedValues: unknown[]): null
    key(key: string): NullData
    optionalKey(key: string): NullData
    readonly array: null
    index(index: number): NullData
}

/**
 * NOTE: should be moved to a separate package in case this pattern is found to be useful
 */
export class UnsafeData {
    protected data: unknown;
    protected context: UnsafeDataContext;

    constructor(data: unknown, context: UnsafeDataContext = {}) {
        this.data = data;
        this.context = context;
    }

    protected get field() {
        return serializeField(this.context.field ?? []);
    }

    protected addKeyToField(key: string) {
        return this.context.field ? [...this.context.field, key] : [key];
    }

    protected fieldWithKey(key: string) {
        return serializeField(this.addKeyToField(key));
    }

    /**
     * Returns undefined if the key is not present on the object. Note that this doesn't check for null.
     */
    optionalKey(key: string): UnsafeData|undefined {
        if (typeof this.data !== 'object' || this.data === null) {
            throw new errors.ValidationError({message: `${this.field} must be an object`});
        }

        if (!Object.prototype.hasOwnProperty.call(this.data, key)) {
            return undefined;
        }

        return new UnsafeData((this.data as Record<string, unknown>)[key], {
            field: this.addKeyToField(key)
        });
    }

    key(key: string): UnsafeData {
        if (typeof this.data !== 'object' || this.data === null) {
            throw new errors.ValidationError({message: `${this.field} must be an object`});
        }

        if (!Object.prototype.hasOwnProperty.call(this.data, key)) {
            throw new errors.ValidationError({message: `${this.fieldWithKey(key)} is required`});
        }

        return new UnsafeData((this.data as Record<string, unknown>)[key], {
            field: this.addKeyToField(key)
        });
    }

    /**
     * Use this to get a nullable value:
     * ```
     * const url: string|null = data.key('url').nullable.string
     * ```
     */
    get nullable(): UnsafeData|NullData {
        if (this.data === null) {
            const d: NullData = {
                get string() {
                    return null;
                },
                get boolean() {
                    return null;
                },
                get number() {
                    return null;
                },
                get integer() {
                    return null;
                },
                get url() {
                    return null;
                },
                enum() {
                    return null;
                },
                key() {
                    return d;
                },
                optionalKey() {
                    return d;
                },
                get array() {
                    return null;
                },
                index() {
                    return d;
                }
            };
            return d;
        }
        return this;
    }

    get string(): string {
        if (typeof this.data !== 'string') {
            throw new errors.ValidationError({message: `${this.field} must be a string`});
        }
        return this.data;
    }

    get boolean(): boolean {
        if (typeof this.data !== 'boolean') {
            throw new errors.ValidationError({message: `${this.field} must be a boolean`});
        }
        return this.data;
    }

    get number(): number {
        if (typeof this.data === 'string') {
            const parsed = parseFloat(this.data);
            if (isNaN(parsed) || parsed.toString() !== this.data) {
                throw new errors.ValidationError({message: `${this.field} must be a number, got ${typeof this.data}`});
            }
            return new UnsafeData(parsed, this.context).number;
        }

        if (typeof this.data !== 'number') {
            throw new errors.ValidationError({message: `${this.field} must be a number, got ${typeof this.data}`});
        }
        if (Number.isNaN(this.data) || !Number.isFinite(this.data)) {
            throw new errors.ValidationError({message: `${this.field} must be a finite number`});
        }
        return this.data;
    }

    get integer(): number {
        if (typeof this.data === 'string') {
            const parsed = parseInt(this.data);
            if (isNaN(parsed) || parsed.toString() !== this.data) {
                throw new errors.ValidationError({message: `${this.field} must be an integer`});
            }
            return new UnsafeData(parseInt(this.data), this.context).integer;
        }

        const number = this.number;
        if (!Number.isSafeInteger(number)) {
            throw new errors.ValidationError({message: `${this.field} must be an integer`});
        }
        return number;
    }

    get url(): URL {
        if (this.data instanceof URL) {
            return this.data;
        }

        const string = this.string;
        try {
            const url = new URL(string);

            if (!['http:', 'https:'].includes(url.protocol)) {
                throw new errors.ValidationError({message: `${this.field} must be a valid URL`});
            }
            return url;
        } catch (e) {
            throw new errors.ValidationError({message: `${this.field} must be a valid URL`});
        }
    }

    enum<T>(allowedValues: T[]): T {
        if (!allowedValues.includes(this.data as T)) {
            throw new errors.ValidationError({message: `${this.field} must be one of ${allowedValues.join(', ')}`});
        }
        return this.data as T;
    }

    get array(): UnsafeData[] {
        if (!Array.isArray(this.data)) {
            throw new errors.ValidationError({message: `${this.field} must be an array`});
        }
        return this.data.map((d, i) => new UnsafeData(d, {field: this.addKeyToField(`${i}`)}));
    }

    index(index: number) {
        const arr = this.array;
        if (index < 0 || !Number.isSafeInteger(index)) {
            throw new errors.IncorrectUsageError({message: `index must be a positive integer`});
        }
        if (index >= arr.length) {
            throw new errors.ValidationError({message: `${this.field} must be an array of length ${index + 1}`});
        }
        return arr[index];
    }
}
