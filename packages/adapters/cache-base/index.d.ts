export = BaseCacheAdapter;

/**
 * Base class for cache adapters.
 *
 * Concrete adapters should extend this class and implement the methods listed
 * in `requiredFns`: `get`, `set`, `reset` and `keys`.
 */
declare abstract class BaseCacheAdapter<K = string, V = unknown> {
    /**
     * The list of method names a concrete cache adapter is required to implement.
     *
     * NOTE: the "keys" method is only here to provide a smooth migration from the
     * deprecated "getAll" method. Once use of "getAll" is eradicated, "keys" can
     * also be removed from the interface.
     */
    readonly requiredFns: ReadonlyArray<'get' | 'set' | 'reset' | 'keys'>;

    /**
     * Retrieve the value stored under the given key.
     */
    abstract get(key: K): unknown;

    /**
     * Store a value under the given key.
     */
    abstract set(key: K, value: V): unknown;

    /**
     * Clear the entire cache.
     */
    abstract reset(): unknown;

    /**
     * List all keys currently held in the cache.
     */
    abstract keys(): unknown;
}
