import type {PersistenceAdapter} from '../persistence/adapter';

export abstract class Factory<TOptions extends Record<string, unknown> = Record<string, unknown>, TResult = TOptions> {
    abstract entityType: string;

    protected adapter?: PersistenceAdapter;

    constructor(adapter?: PersistenceAdapter) {
        this.adapter = adapter;
    }

    // name allows you to identify Factory by it's class name
    get name(): string {
        return this.constructor.name;
    }

    abstract build(options?: Partial<TOptions>): TResult;

    async create(options?: Partial<TOptions>): Promise<TResult> {
        if (!this.adapter) {
            throw new Error('Cannot create without a persistence adapter. Use build() for in-memory objects.');
        }
        const data = this.build(options);
        return await this.adapter.insert(this.entityType, data) as Promise<TResult>;
    }
}
