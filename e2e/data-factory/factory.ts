import type {PersistenceAdapter} from './persistence/adapter';

export function withPersistence<TOptions extends Record<string, unknown> = Record<string, unknown>, TResult = TOptions>(
    factory: Factory<TOptions, TResult>,
    adapter: PersistenceAdapter
): PersistentFactory<TOptions, TResult> {
    return new PersistentFactory(factory, adapter);
}

export abstract class Factory<TOptions extends Record<string, unknown> = Record<string, unknown>, TResult = TOptions> {
    abstract entityType: string;
    abstract build(options?: Partial<TOptions>): TResult;
}

export class PersistentFactory<TOptions extends Record<string, unknown> = Record<string, unknown>, TResult = TOptions> {
    entityType: string;

    constructor(private factory: Factory<TOptions, TResult>, private adapter: PersistenceAdapter) {
        this.entityType = factory.entityType;
    }

    build(options?: Partial<TOptions>): TResult {
        return this.factory.build(options);
    }

    async create(options?: Partial<TOptions>): Promise<TResult> {
        const data = this.factory.build(options);
        return await this.adapter.insert(
            this.factory.entityType,
            data
        ) as Promise<TResult>;
    }
}

