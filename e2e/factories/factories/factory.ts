import type {PersistenceAdapter} from '../persistence/adapter';

export abstract class Factory<TOptions = unknown, TResult = unknown> {
    abstract name: string;
    abstract entityType: string;

    private persistence?: PersistenceAdapter;
    private trackingEnabled = true;
    protected createdEntities = new Map<string, TResult>();

    constructor(adapter?: PersistenceAdapter) {
        if (adapter) {
            this.setPersistence(adapter);
        }
    }

    async setup(): Promise<void> {}

    async destroy(): Promise<void> {}

    /**
     * Build an object without persisting it
     */
    abstract build(options?: TOptions): TResult | Promise<TResult>;

    /**
     * Inject persistence adapter
     */
    setPersistence(adapter: PersistenceAdapter): void {
        this.persistence = adapter;
    }

    /**
     * Control entity tracking for cleanup
     */
    setTracking(enabled: boolean): void {
        this.trackingEnabled = enabled;
    }

    async create(options?: TOptions): Promise<TResult> {
        if (!this.persistence) {
            throw new Error(`No persistence adapter configured for ${this.name} factory`);
        }

        // Build the entity
        const entity = await Promise.resolve(this.build(options));

        // Persist using the adapter
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

        // Call factory-specific cleanup
        await this.destroy();
    }

    /**
     * Extract ID from entity (override if needed)
     */
    protected extractId(entity: TResult): string | undefined {
        const e = entity as Record<string, unknown>;
        const id = e.id || e.uuid;
        return typeof id === 'string' ? id : undefined;
    }

    getCreatedEntities(): TResult[] {
        return Array.from(this.createdEntities.values());
    }
}
