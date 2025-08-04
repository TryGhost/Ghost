import type {PersistenceAdapter} from './persistence/types';

export abstract class Factory<TOptions = unknown, TResult = unknown> {
    abstract name: string;
    abstract entityType: string; // Used for persistence routing
    
    private persistence?: PersistenceAdapter;
    private trackingEnabled = true;
    protected createdEntities = new Map<string, TResult>();
    
    /**
     * Set up any necessary resources (database connections, etc.)
     * Override this method if your factory needs initialization
     */
    async setup(): Promise<void> {
        // Default implementation - no setup needed
    }
    
    /**
     * Factory-specific cleanup (override if needed)
     * Called after entities are cleaned up
     */
    async destroy(): Promise<void> {
        // Default implementation - no cleanup needed
    }
    
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
    
    /**
     * Build and persist an object
     */
    async create(options?: TOptions): Promise<TResult> {
        if (!this.persistence) {
            throw new Error(`No persistence adapter configured for ${this.name} factory`);
        }
        
        // Build the entity
        const entity = await Promise.resolve(this.build(options));
        
        // Persist using the adapter
        const persisted = await this.persistence.insert(this.entityType, entity);
        
        // Track for cleanup if enabled
        if (this.trackingEnabled) {
            const id = this.extractId(persisted);
            if (id) {
                this.createdEntities.set(id, persisted);
            }
        }
        
        return persisted;
    }
    
    /**
     * Clean up all created entities
     */
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
    
    /**
     * Get all created entities
     */
    getCreatedEntities(): TResult[] {
        return Array.from(this.createdEntities.values());
    }
}