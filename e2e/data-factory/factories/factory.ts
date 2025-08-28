import type {PersistenceAdapter} from '../persistence/adapter';

export abstract class Factory<TOptions extends Record<string, unknown> = Record<string, unknown>, TResult = TOptions> {
    abstract name: string;
    abstract entityType: string;

    protected adapter?: PersistenceAdapter;

    constructor(adapter?: PersistenceAdapter) {
        this.adapter = adapter;
    }

    /**
     * Build an entity in memory without persisting it
     * This method should be implemented by subclasses to generate dynamic data
     */
    abstract build(options?: Partial<TOptions>): TResult;

    /**
     * Build and persist an entity to the database
     */
    async create(options?: Partial<TOptions>): Promise<TResult> {
        if (!this.adapter) {
            throw new Error('Cannot create without a persistence adapter. Use build() for in-memory objects.');
        }
        const data = this.build(options);
        return await this.adapter.insert(this.entityType, data) as Promise<TResult>;
    }
}
