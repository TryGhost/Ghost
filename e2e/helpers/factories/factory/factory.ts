import type {PersistenceAdapter} from '../persistence/adapter';

export abstract class Factory<TOptions = unknown, TResult = unknown> {
    private readonly persistence?: PersistenceAdapter;

    private trackingEnabled = true;
    readonly abstract entityType: string;
    protected createdEntities = new Map<string, TResult>();

    constructor(adapter?: PersistenceAdapter) {
        this.persistence = adapter;
    }

    get name(): string {
        return this.constructor.name;
    }

    public async setup(): Promise<void> {}

    public async destroy(): Promise<void> {}

    public abstract build(options?: TOptions): TResult | Promise<TResult>;

    async create(options?: TOptions): Promise<TResult> {
        if (!this.persistence) {
            throw new Error(`No persistence adapter configured for ${this.name} factory.`);
        }

        const entity = await this.build(options);
        const persisted = await this.persistence.insert(this.entityType, entity);

        if (this.trackingEnabled) {
            const id = this.extractId(persisted);
            if (id) {
                this.createdEntities.set(id, persisted);
            }
        }

        return persisted;
    }

    async cleanup(): Promise<void> {
        if (!this.persistence || this.createdEntities.size === 0) {
            return;
        }

        const ids = Array.from(this.createdEntities.keys());
        await this.persistence.deleteMany(this.entityType, ids);
        this.createdEntities.clear();

        await this.destroy();
    }

    set tracking(enabled: boolean) {
        this.trackingEnabled = enabled;
    }

    protected extractId(entity: TResult): string | undefined {
        const e = entity as Record<string, unknown>;
        const id = e.id || e.uuid;
        return typeof id === 'string' ? id : undefined;
    }

    getCreatedEntities(): TResult[] {
        return Array.from(this.createdEntities.values());
    }
}
