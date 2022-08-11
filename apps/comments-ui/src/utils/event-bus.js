class EventBus {
    listeners = new Map()

    addListener(owner, type, listener) {
        const existing = this.listeners.get(owner);
        if (existing) {
            existing.push({type, listener});
        } else {
            this.listeners.set(owner, [{type, listener}]);
        }
    }

    /**
     * 
     * @param {*} owner 
     * @param {*} [type] Leave out if you want to remove all types
     */
    removeListener(owner, type) {
        if (type) {
            const existing = this.listeners.get(owner);
            if (existing) {
                this.listeners.set(
                    owner, 
                    existing.filter(t => t.type !== type)
                );
            }
        } else {
            this.listeners.delete(owner);
        }
    }

    /**
     * 
     * @param {*} type 
     * @param {*} value 
     * @param {*} [excludeOwner] Don't send the event to this owner (e.g. the sender of the message doesn't want to receive it when it is also listening for it)
     * @returns 
     */
    sendEvent(type, value, excludeOwner) {
        const values = [];
        for (const owner of this.listeners.values()) {
            if (excludeOwner !== undefined && owner === excludeOwner) {
                return;
            }

            for (const listener of owner) {
                if (listener.type === type) {
                    values.push(listener.listener(value, type));
                }
            }
        }
        return values;
    }
}

export const GlobalEventBus = new EventBus();
