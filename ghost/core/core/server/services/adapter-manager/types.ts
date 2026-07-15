export interface Adapter {
    requiredFns: readonly string[];
}

/**
 * Constructor type that matches abstract as well as concrete base classes.
 */
export type AdapterConstructor<T extends Adapter = Adapter> = abstract new (...args: any[]) => T;

/**
 * Map from an adapter type name (e.g. "storage") to the base class all
 * adapters of that type must extend. Passed to the AdapterManager constructor,
 * it doubles as the runtime lookup table and the type-level source of truth
 * for which names `getAdapter` accepts and what it returns.
 */
export type AdapterClassMap = Record<string, AdapterConstructor>;

/**
 * Strip an optional ":feature" suffix from an adapter name.
 * e.g. "storage:images" -> "storage", "storage" -> "storage"
 */
export type AdapterType<Name extends string> = Name extends `${infer Type}:${string}` ? Type : Name;

/**
 * All valid names accepted by `getAdapter` for a given class map: each
 * registered type on its own, plus any "type:feature" extension of it.
 */
export type AdapterName<ClassMap extends AdapterClassMap> = keyof ClassMap extends string
    ? keyof ClassMap | `${keyof ClassMap}:${string}`
    : never;

/**
 * Resolve the registered adapter instance type for a (possibly feature-suffixed)
 * name, e.g. ResolvedAdapter<Map, "storage:images"> === InstanceType<Map["storage"]>.
 */
export type ResolvedAdapter<ClassMap extends AdapterClassMap, Name extends string> =
    AdapterType<Name> extends keyof ClassMap ? InstanceType<ClassMap[AdapterType<Name>]> : never;
