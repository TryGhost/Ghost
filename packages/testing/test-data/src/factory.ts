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
    /** Build `count` entities, each from fresh (unique) defaults; `overrides(i)` customises per index. */
    many(count: number, overrides?: (index: number) => Partial<T>): T[];
}

export function createBuilder<T extends object>(defaults: (overrides: Partial<T>) => T): Builder<T> {
    const build = (overrides: Partial<T> = {}): T => ({...defaults(overrides), ...overrides});
    build.many = (countOrList: number | Array<Partial<T>>, overrides?: (index: number) => Partial<T>): T[] => {
        if (typeof countOrList === "number") {
            return Array.from({length: countOrList}, (_, index) => build(overrides?.(index)));
        }
        return countOrList.map(itemOverrides => build(itemOverrides));
    };
    return build as Builder<T>;
}

export type RequiredBuilderInput<T, TRequiredKeys extends keyof T> = Required<Pick<T, TRequiredKeys>> & Partial<Omit<T, TRequiredKeys>>;

export interface RequiredBuilder<T, TRequiredKeys extends keyof T> {
    (input: RequiredBuilderInput<T, TRequiredKeys>): T;
    /** Build one entity per input; required context must be declared for every entity. */
    many(inputs: Array<RequiredBuilderInput<T, TRequiredKeys>>): T[];
}

export function createRequiredBuilder<T extends object, TRequiredKeys extends keyof T>(defaults: (input: RequiredBuilderInput<T, TRequiredKeys>) => Omit<T, TRequiredKeys>): RequiredBuilder<T, TRequiredKeys> {
    const build = (input: RequiredBuilderInput<T, TRequiredKeys>): T => ({...defaults(input), ...input}) as T;
    build.many = (inputs: Array<RequiredBuilderInput<T, TRequiredKeys>>): T[] => inputs.map(build);
    return build;
}
