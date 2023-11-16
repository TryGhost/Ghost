class EventAwareCacheWrapper {
    #cache;
    #logging;

    /**
     * @param {Object} deps
     * @param {Object} deps.cache - cache instance extending adapter-base-cache
     * @param {Object} deps.logging - logging instance
     * @param {Object} [deps.eventRegistry] - event registry instance
     * @param {String[]} [deps.resetEvents] - events that should trigger a cache reset
     */
    constructor(deps) {
        this.#cache = deps.cache;
        this.#logging = deps.logging;

        if (deps.resetEvents && deps.eventRegistry) {
            this.#initListeners(deps.eventRegistry, deps.resetEvents);
        }
    }

    #initListeners(eventRegistry, eventsToResetOn) {
        eventsToResetOn.forEach((event) => {
            eventRegistry.on(event, () => {
                this.#logging.info(`Purging cache entries prefixed with "${this.#cache.keyPrefix}" due to event: ${event}`);

                this.reset();
            });
        });
    }

    async get(key) {
        return this.#cache.get(key);
    }

    async set(key, value) {
        return this.#cache.set(key, value);
    }

    reset() {
        return this.#cache.reset();
    }
}

module.exports = EventAwareCacheWrapper;
