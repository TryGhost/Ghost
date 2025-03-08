import {beforeEach, describe, expect, it} from 'vitest';

import {type Entity, type EntityStore, createEntityStore} from '../../../src/state/entity-store';

type NamedEntity = Entity & {
    name: string;
};

describe('Entity Store', () => {
    let store: EntityStore<NamedEntity>;

    beforeEach(() => {
        store = createEntityStore<NamedEntity>().getState();
        store.entities.clear();
        store.collections.clear();
    });

    describe('add', () => {
        it('should add an entity to the store', () => {
            const entity = {id: '1', name: 'Entity 1'};

            store.add(entity);

            const storedEntity = store.getById(entity.id);

            expect(storedEntity).toEqual(entity);
        });

        it('should overwrite an existing entity', () => {
            const entity = {id: '1', name: 'Entity 1'};
            const entityWithUpdatedName = {...entity, name: 'Entity 2'};

            store.add(entity);
            store.add(entityWithUpdatedName);

            const storedEntity = store.getById(entity.id);

            expect(storedEntity).toEqual(entityWithUpdatedName);
        });
    });

    describe('addToCollection', () => {
        it('should add an entity to a new collection', () => {
            const entity = {id: '1', name: 'Entity 1'};
            const collectionKey = 'entity_collection_1';

            store.add(entity);
            store.addToCollection(collectionKey, entity.id);

            const collection = store.getCollection(collectionKey);

            expect(collection).toHaveLength(1);
            expect(collection[0]).toEqual(entity);
        });

        it('should add an entity to the end of a collection by default', () => {
            const entity1 = {id: '1', name: 'Entity 1'};
            const entity2 = {id: '2', name: 'Entity 2'};
            const collectionKey = 'entity_collection_1';

            store.add(entity1);
            store.add(entity2);

            store.addToCollection(collectionKey, entity1.id);
            store.addToCollection(collectionKey, entity2.id);

            const collection = store.getCollection(collectionKey);

            expect(collection).toHaveLength(2);
            expect(collection[0]).toEqual(entity1);
            expect(collection[1]).toEqual(entity2);
        });

        it('should add an entity to the start of a collection when specified', () => {
            const entity1 = {id: '1', name: 'Entity 1'};
            const entity2 = {id: '2', name: 'Entity 2'};
            const collectionKey = 'entity_collection_1';

            store.add(entity1);
            store.add(entity2);

            store.addToCollection(collectionKey, entity1.id, 'start');
            store.addToCollection(collectionKey, entity2.id, 'start');

            const collection = store.getCollection(collectionKey);

            expect(collection).toHaveLength(2);
            expect(collection[0]).toEqual(entity2);
            expect(collection[1]).toEqual(entity1);
        });

        it('should add an entity at a specific position when specified', () => {
            const entity1 = {id: '1', name: 'Entity 1'};
            const entity2 = {id: '2', name: 'Entity 2'};
            const entity3 = {id: '3', name: 'Entity 3'};
            const collectionKey = 'entity_collection_1';

            store.add(entity1);
            store.add(entity2);
            store.add(entity3);

            store.addToCollection(collectionKey, entity1.id);
            store.addToCollection(collectionKey, entity2.id);
            store.addToCollection(collectionKey, entity3.id, 1);

            const collection = store.getCollection(collectionKey);

            expect(collection).toHaveLength(3);
            expect(collection[0]).toEqual(entity1);
            expect(collection[1]).toEqual(entity3);
            expect(collection[2]).toEqual(entity2);
        });

        it('should not add duplicate entities to a collection', () => {
            const entity = {id: '1', name: 'Entity 1'};
            const collectionKey = 'entity_collection_1';

            store.add(entity);
            store.addToCollection(collectionKey, entity.id);
            store.addToCollection(collectionKey, entity.id);

            const collection = store.getCollection(collectionKey);

            expect(collection).toHaveLength(1);
        });
    });

    describe('removeFromCollection', () => {
        it('should remove an entity from a collection', () => {
            const entity = {id: '1', name: 'Entity 1'};
            const collectionKey = 'entity_collection_1';

            store.add(entity);
            store.addToCollection(collectionKey, entity.id);
            store.removeFromCollection(collectionKey, entity.id);

            const collection = store.getCollection(collectionKey);

            expect(collection).toHaveLength(0);
        });

        it('should handle removing an entity from a non-existent collection', () => {
            expect(() => {
                store.removeFromCollection('nonexistent', '1');
            }).not.toThrow();
        });
    });

    describe('updateById', () => {
        it('should update an entity by ID', () => {
            const entity = {id: '1', name: 'Entity 1'};

            store.add(entity);
            store.updateById(entity.id, e => ({
                ...e,
                name: 'Some updated name'
            }));

            const updatedEntity = store.getById(entity.id);

            expect(updatedEntity?.name).toBe('Some updated name');
        });

        it('should handle updating a non-existent entity', () => {
            expect(() => {
                store.updateById('nonexistent', e => e);
            }).not.toThrow();
        });
    });

    describe('getCollection', () => {
        it('should return an empty array for a non-existent collection', () => {
            const collection = store.getCollection('nonexistent');

            expect(collection).toEqual([]);
        });

        it('should return only entities that exist in the store', () => {
            const entity = {id: '1', name: 'Entity 1'};
            const collectionKey = 'entity_collection_1';

            store.add(entity);
            store.addToCollection(collectionKey, entity.id);
            store.addToCollection(collectionKey, 'nonexistent');

            const collection = store.getCollection(collectionKey);

            expect(collection).toHaveLength(1);
            expect(collection[0]).toEqual(entity);
        });
    });

    describe('getPositionInCollection', () => {
        it('should return the position of an entity in a collection', () => {
            const entity1 = {id: '1', name: 'Entity 1'};
            const entity2 = {id: '2', name: 'Entity 2'};
            const collectionKey = 'entity_collection_1';

            store.add(entity1);
            store.add(entity2);

            store.addToCollection(collectionKey, entity1.id);
            store.addToCollection(collectionKey, entity2.id);

            const position = store.getPositionInCollection(collectionKey, entity2.id);

            expect(position).toBe(1);
        });

        it('should return -1 for an entity not in the collection', () => {
            const position = store.getPositionInCollection('nonexistent', 'nonexistent');

            expect(position).toBe(-1);
        });
    });

    describe('getById', () => {
        it('should return an entity by ID', () => {
            const entity = {id: '1', name: 'Entity 1'};

            store.add(entity);

            const retrievedEntity = store.getById(entity.id);

            expect(retrievedEntity).toEqual(entity);
        });

        it('should return undefined for a non-existent entity', () => {
            const entity = store.getById('nonexistent');

            expect(entity).toBeUndefined();
        });
    });
});
