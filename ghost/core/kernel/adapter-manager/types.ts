export interface Adapter {
  requiredFns: readonly string[];
}

/**
 * Constructor type that matches abstract as well as concrete base classes.
 *
 * The optional static `validate` lets an adapter check the options it would be
 * constructed with — without being instantiated — so misconfiguration can be
 * surfaced at boot rather than on first lazy use. It is synchronous and throws
 * (e.g. `IncorrectUsageError`) when the config is invalid. This is the loose,
 * manager-facing signature; a concrete adapter is free to declare a narrower
 * assertion signature (`asserts config is XOptions`) on its own static.
 */
export type AdapterConstructor<T extends Adapter = Adapter> = (abstract new (
  ...args: any[]
) => T) & {
  validate?(config?: object): void;
};

/**
 * The configuration of one adapter type. `active` names the class used when a
 * lookup does not select another one. A key matching a class name holds that
 * class's constructor options. Any other key is a feature (e.g. `images` for
 * `storage:images`) that either names a class as a string or carries inline
 * feature options as an object with an `adapter` property naming the class.
 */
export interface AdapterTypeConfig {
  active?: string;
  [key: string]: unknown;
}

/**
 * Adapter configuration keyed by adapter type name, e.g.
 * `{storage: {active: 'LocalStorage', media: 'S3Storage', S3Storage: {...}}}`.
 *
 * The manager reads this through the `getConfig` callback it is constructed
 * with, on every lookup, so the application decides where the configuration
 * comes from and whether it can change at runtime.
 */
export type AdapterConfig = Record<string, AdapterTypeConfig | undefined>;

/**
 * A type-only registry mapping an adapter type name (e.g. "storage") to the
 * instance type of the base class registered for it. Derived from the
 * `baseClasses` map passed to `AdapterManager` — see `RegistryOf`.
 */
export type AdapterRegistry = Record<string, Adapter>;

/**
 * Strip an optional ":feature" suffix from an adapter name.
 * e.g. "storage:images" -> "storage", "storage" -> "storage"
 */
export type AdapterType<Name extends string> = Name extends `${infer Type}:${string}` ? Type : Name;

/**
 * All valid names accepted by `getAdapter` for a given registry: each registered
 * type on its own, plus any "type:feature" extension of it.
 */
export type AdapterName<Registry extends AdapterRegistry> = keyof Registry extends string
  ? keyof Registry | `${keyof Registry}:${string}`
  : never;

/**
 * Resolve the registered adapter instance type for a (possibly feature-suffixed)
 * name, e.g. ResolvedAdapter<R, "storage:images"> === R["storage"].
 */
export type ResolvedAdapter<Registry extends AdapterRegistry, Name extends string> =
  AdapterType<Name> extends keyof Registry ? Registry[AdapterType<Name>] : never;
