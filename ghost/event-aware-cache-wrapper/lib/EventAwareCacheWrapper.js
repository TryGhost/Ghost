class EventAwareCacheWrapper {
    #cache;
    /**
     * @param {Object} deps
     * @param {Object} deps.cache - cache instance extending adapter-base-cache
     * @param {Object} [deps.eventRegistry] - event registry instance
     * @param {String[]} [deps.resetEvents] - event to listen to triggering reset
     */
    constructor(deps) {
        this.#cache = deps.cache;

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
