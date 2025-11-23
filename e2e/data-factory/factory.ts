import type {PersistenceAdapter} from './persistence/adapter';

export abstract class Factory<TOptions extends Record<string, unknown> = Record<string, unknown>, TResult = TOptions> {
    abstract entityType: string;

    protected adapter?: PersistenceAdapter;

    constructor(adapter?: PersistenceAdapter) {
        this.adapter = adapter;
    }

    abstract build(options?: Partial<TOptions>): TResult;

    buildMany(optionsList: Partial<TOptions>[]): TResult[] {
        return optionsList.map(options => this.build(options));
    }

    async create(options?: Partial<TOptions>): Promise<TResult> {
        if (!this.adapter) {
            throw new Error('Cannot create without a persistence adapter. Use build() for in-memory objects.');
        }
        const data = this.build(options);
        return await this.adapter.insert(this.entityType, data) as Promise<TResult>;
    }

    async createMany(optionsList: Partial<TOptions>[]): Promise<TResult[]> {
        if (!this.adapter) {
            throw new Error('Cannot create without a persistence adapter. Use buildMany() for in-memory objects.');
        }

        const results: TResult[] = [];
        for (const options of optionsList) {
            const result = await this.create(options);
            results.push(result);
        }
        return results;
    }
}
