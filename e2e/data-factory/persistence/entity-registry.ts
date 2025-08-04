export interface EntityMetadata {
    tableName?: string; // For database adapters
    endpoint?: string; // For API adapters
    primaryKey?: string; // Default: 'id'
}

export interface EntityRegistry {
    register(entityType: string, metadata: EntityMetadata): void;
    getMetadata(entityType: string): EntityMetadata;
}

export class DefaultEntityRegistry implements EntityRegistry {
    private metadata = new Map<string, EntityMetadata>();

    register(entityType: string, metadata: EntityMetadata): void {
        this.metadata.set(entityType, metadata);
    }

    getMetadata(entityType: string): EntityMetadata {
        const meta = this.metadata.get(entityType);
        return (meta === undefined) ? this.defaultMetadata(entityType) : meta;
    }

    private defaultMetadata(entityType: string):EntityMetadata {
        return {
            tableName: entityType,
            primaryKey: 'id'
        };
    };
}
