/**
 * Generic factory base: a builder is a function that produces a fully-populated
 * entity from randomised defaults, with caller overrides winning field-by-field.
 *
 * Builders are pure data — no persistence, no HTTP, no test-runner coupling.
 * Consumers layer their own behaviour on top: the e2e suite wraps builders in
 * persistence-aware factories (POSTing the built entity to a real Ghost), while
 * the admin acceptance harness serves built entities straight from MSW handlers.
 */
export interface Builder<T> {
    (overrides?: Partial<T>): T;
    /** Build one entity per overrides object, e.g. `tag.many([{name: 'A'}, {name: 'B'}])`. */
    many(overridesList: Array<Partial<T>>): T[];
}

export function createBuilder<T extends object>(defaults: () => T): Builder<T> {
    const build = (overrides: Partial<T> = {}): T => ({...defaults(), ...overrides});
    build.many = (overridesList: Array<Partial<T>>): T[] => overridesList.map(overrides => build(overrides));
    return build as Builder<T>;
}
