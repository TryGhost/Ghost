/**
 * A Map that lazily computes missing values via the supplied function.
 * Equivalent to the stage-4 `Map.prototype.getOrInsertComputed` proposal.
 *
 * Consumers can be typed as `ReadonlyMap<K, V>` so they only see `.get`
 * (and `.has`, etc.); the owner keeps full Map semantics including
 * `.delete(key)` and `.clear()` for invalidation flows.
 */
export class AutoFillingMap<K, V> extends Map<K, V> {
    readonly #compute: (key: K) => V;

    constructor(compute: (key: K) => V) {
        super();
        this.#compute = compute;
    }

    get(key: K): V {
        if (!super.has(key)) {
            super.set(key, this.#compute(key));
        }
        return super.get(key)!;
    }
}
