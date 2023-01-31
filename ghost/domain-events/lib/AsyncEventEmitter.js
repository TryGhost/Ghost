const errors = require('@tryghost/errors');
const logging = require('@tryghost/logging');

class AsyncEventEmitter {
    /**
     * @private
     * @type Map<string, ((data: any) => (Promise<void> | void))[]>
     */
    listeners = new Map();

    /**
     *
     * @param {string} event
     * @param {(data: any) => void | Promise<void>} listener
     */
    on(event, listener) {
        if (typeof event !== 'string') {
            throw new errors.IncorrectUsageError({
                message: 'Cannot add an event listener without a string event name'
            });
        }
        this.listeners.set(event, (this.listeners.get(event) || []).concat(listener));
    }

    /**
     * @param {string} event
     */
    listenerCount(event) {
        return this.listeners.get(event)?.length ?? 0;
    }

    /**
     * We'll wait on each listener before calling the next one, to avoid too much concurrency
     * @param {string} name
     * @param {any} data
     */
    async emit(name, data) {
        try {
            for (const listener of this.listeners.get(name) || []) {
                try {
                    await listener(data);
                } catch (e) {
                    logging.error('Unhandled error in event handler for event: ' + name);
                    logging.error(e);
                }
            }
        } catch (e) {
            // Avoid unhandled promise rejections in case emit is not awaited
            logging.error('Unhandled error in AsyncEventEmitter for ' + name);
            logging.error(e);
        }
    }
}

module.exports = AsyncEventEmitter;
