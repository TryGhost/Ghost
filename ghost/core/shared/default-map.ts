/**
 * Like `Map`, but sets a default value for keys that don't exist yet.
 *
 * @example
 * const map = new DefaultMap(() => []);
 * map.get('key').push(123);
 * map.get('key');
 * // => [123]
 */
export class DefaultMap<K, V> {
  #getDefaultValue: () => V;
  #map = new Map<K, V>();

  constructor(getDefaultValue: () => V) {
    this.#getDefaultValue = getDefaultValue;
  }

  get(key: K): V {
    if (!this.#map.has(key)) {
      this.#map.set(key, this.#getDefaultValue());
    }
    return this.#map.get(key)!;
  }

  set(key: K, value: V): this {
    this.#map.set(key, value);
    return this;
  }

  values(): MapIterator<V> {
    return this.#map.values();
  }
}
