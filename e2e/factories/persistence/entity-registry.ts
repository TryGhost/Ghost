export interface DatabaseMetadata {
    tableName: string;
    primaryKey?: string;
}

export interface APIMetadata {
    endpoint: string;
}

export interface TinyBirdApiMetadata extends APIMetadata {
    primaryKey: string;
}

export class EntityRegistry<M> {
    protected metadata = new Map<string, M>();

    register(entityType: string, metadata: M): void {
        this.metadata.set(entityType, metadata);
    }

    getMetadata(entityType: string){
        const meta = this.metadata.get(entityType);
        if (!meta) {
            throw new Error(`No metadata found for entity type: ${entityType}`);
        }
        return meta;
    }
}
