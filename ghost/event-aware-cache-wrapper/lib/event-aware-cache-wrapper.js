class EventAwareCacheWrapper {
    #cache;

    #lastReset;

    /**
     * @param {Object} deps
     * @param {Object} deps.cache - cache instance extending adapter-base-cache
     * @param {Object} [deps.eventRegistry] - event registry instance
     * @param {Number} [deps.lastReset] - timestamp of last reset
     * @param {String[]} [deps.resetEvents] - event to listen to triggering reset
     */
    constructor(deps) {
        this.#cache = deps.cache;
        this.#lastReset = deps.lastReset || Date.now();

        if (deps.resetEvents && deps.eventRegistry) {
            this.#initListeners(deps.eventRegistry, deps.resetEvents);
        }
    }

    #initListeners(eventRegistry, eventsToResetOn) {
        eventsToResetOn.forEach((event) => {
            eventRegistry.on(event, () => {
                this.reset();
            });
        });
    }

    #buildResetAwareKey(key) {
        return `${this.#lastReset}:${key}`;
    }

    async get(key) {
        return this.#cache.get(this.#buildResetAwareKey(key));
    }

    async set(key, value) {
        return this.#cache.set(this.#buildResetAwareKey(key), value);
    }

    /**
     * Reset the cache without removing of flushing the keys
     * The mechanism is based on adding a timestamp to the key
     * This way the cache is invalidated but the keys are still there
     */
    reset() {
        this.#lastReset = Date.now();
    }
}

module.exports = EventAwareCacheWrapper;
