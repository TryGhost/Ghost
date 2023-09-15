export class EntityWithIncludes<T, Includes extends string = string> {
    entity: T;
    includes: Map<Includes, unknown> = new Map();

    private constructor(entity: T) {
        this.entity = entity;
    }

    // eslint-disable-next-line no-shadow
    static create<Entity, Includes extends string>(entity: Entity): EntityWithIncludes<Entity, Includes> {
        return new EntityWithIncludes(entity);
    }

    setInclude(include: Includes, value: unknown) {
        this.includes.set(include, value);
    }
}
