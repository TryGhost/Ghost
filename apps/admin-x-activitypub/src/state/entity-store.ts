import {create} from 'zustand';

export interface Entity {
    id: string;
}

/**
 * Normalized store for entities
 */
export interface EntityStore<T extends Entity> {
    /**
     * A map of entity IDs to entities
     */
    entities: Map<string, T>;
    /**
     * A map of collection keys to sets of entity IDs.
     */
    collections: Map<string, Set<string>>;
    /**
     * Add an entity to the store
     */
    add: (entity: T) => void;
    /**
     * Add an entity to a collection
     */
    addToCollection: (collectionKey: string, entityId: string, placement?: 'start' | 'end' | number) => void;
    /**
     * Remove an entity from a collection
     */
    removeFromCollection: (collectionKey: string, entityId: string) => void;
    /**
     * Update an entity by ID
     */
    updateById: (entityId: string, update: (entity: T) => T) => void;
    /**
     * Get a collection by key
     */
    getCollection: (collectionKey: string) => T[];
    /**
     * Get the position of an entity in a collection
     */
    getPositionInCollection: (collectionKey: string, entityId: string) => number;
    /**
     * Get an entity by ID
     */
    getById: (entityId: string) => T | undefined;
}

export const createEntityStore = <T extends Entity>() => {
    return create<EntityStore<T>>((set, get) => ({
        entities: new Map(),
        collections: new Map(),
        add: (entity: T) => set((state) => {
            const entities = new Map(state.entities);
            entities.set(entity.id, entity);
            return {
                entities
            };
        }),
        addToCollection: (collectionKey: string, entityId: string, placement: 'start' | 'end' | number = 'end') => set((state) => {
            const existingCollection = state.collections.get(collectionKey) || new Set();
            let updatedCollection;

            if (placement === 'start') {
                updatedCollection = new Set([entityId, ...existingCollection]);
            } else if (placement === 'end') {
                updatedCollection = new Set([...existingCollection, entityId]);
            } else {
                const collectionArray = Array.from(existingCollection);
                collectionArray.splice(placement, 0, entityId);
                updatedCollection = new Set(collectionArray);
            }

            return {
                collections: new Map(state.collections).set(collectionKey, updatedCollection)
            };
        }),
        removeFromCollection: (collectionKey: string, entityId: string) => set((state) => {
            const existingCollection = state.collections.get(collectionKey);

            if (!existingCollection) {
                return {
                    collections: state.collections
                };
            }

            const updatedCollection = new Set(existingCollection);
            updatedCollection.delete(entityId);

            const updatedCollections = new Map(state.collections);
            updatedCollections.set(collectionKey, updatedCollection);

            return {
                collections: updatedCollections
            };
        }),
        updateById: (entityId: string, update: (entity: T) => T) => set((state) => {
            const existingEntity = state.entities.get(entityId);

            if (!existingEntity) {
                return {
                    entities: state.entities
                };
            }

            const entities = new Map(state.entities);
            entities.set(entityId, update(existingEntity));

            return {
                entities
            };
        }),
        getCollection: (collectionKey: string) => {
            return Array.from(get().collections.get(collectionKey) || [])
                .map(id => get().entities.get(id))
                .filter((entity): entity is T => entity !== undefined);
        },
        getPositionInCollection: (collectionKey: string, entityId: string) => {
            return Array.from(get().collections.get(collectionKey) || [])
                .indexOf(entityId);
        },
        getById: (entityId: string) => {
            return get().entities.get(entityId);
        }
    }));
};
