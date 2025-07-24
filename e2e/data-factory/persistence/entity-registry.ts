import type {EntityRegistry, EntityMetadata} from './types';

/**
 * Default implementation of entity registry with sensible defaults
 */
export class DefaultEntityRegistry implements EntityRegistry {
    private metadata = new Map<string, EntityMetadata>();
    
    register(entityType: string, metadata: EntityMetadata): void {
        this.metadata.set(entityType, metadata);
    }
    
    getMetadata(entityType: string): EntityMetadata {
        const meta = this.metadata.get(entityType);
        if (!meta) {
            // Sensible defaults - entity type maps to table name
            return {
                tableName: entityType,
                primaryKey: 'id'
            };
        }
        return meta;
    }
    
    // Helper method to register multiple entities at once
    registerMany(entities: Record<string, EntityMetadata>): void {
        Object.entries(entities).forEach(([entityType, metadata]) => {
            this.register(entityType, metadata);
        });
    }
}